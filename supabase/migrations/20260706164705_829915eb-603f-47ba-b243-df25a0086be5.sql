CREATE OR REPLACE FUNCTION public.redeem_access_token(_token_plain text, _subject_type access_subject_type DEFAULT NULL::access_subject_type, _subject_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(session_id uuid, attempt_id uuid, status access_session_status, reason text, rule_applied text, remaining_capacity integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _hash text;
  _tok public.access_tokens%ROWTYPE;
  _space public.reservable_spaces%ROWTYPE;
  _active_count int;
  _decision public.access_attempt_status;
  _reason text;
  _rule text;
  _attempt_id uuid;
  _session_id uuid;
  _session_status public.access_session_status;
  _session_reason text;
  _effective_cap int;
  _remaining int;
  _sub_type public.access_subject_type;
  _sub_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF _token_plain IS NULL OR char_length(_token_plain) < 8 THEN
    RAISE EXCEPTION 'invalid token';
  END IF;

  _hash := encode(extensions.digest(_token_plain, 'sha256'), 'hex');

  SELECT * INTO _tok FROM public.access_tokens WHERE token_hash = _hash FOR UPDATE;
  IF _tok.id IS NULL THEN
    RAISE EXCEPTION 'token not found';
  END IF;

  IF NOT public.is_active_org_member(_uid, _tok.organization_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM public.record_audit_event(
    _tok.organization_id, _uid, 'token.validated', 'access_token', _tok.id,
    jsonb_build_object('target_type', _tok.target_type, 'target_id', _tok.target_id),
    NULL, NULL
  );

  _sub_type := COALESCE(_subject_type, _tok.subject_type);
  _sub_id := COALESCE(_subject_id, _tok.subject_id);
  IF _sub_type IS NULL OR _sub_id IS NULL THEN
    _sub_type := 'user'; _sub_id := _uid;
  END IF;

  IF _tok.status <> 'active' THEN
    INSERT INTO public.access_sessions (
      event_id, organization_id, token_id,
      space_id, sector_id, subject_type, subject_id,
      status, reason
    ) VALUES (
      _tok.event_id, _tok.organization_id, _tok.id,
      CASE WHEN _tok.target_type = 'space' THEN _tok.target_id END,
      CASE WHEN _tok.target_type = 'sector' THEN _tok.target_id END,
      _sub_type, _sub_id,
      'blocked', 'token_' || _tok.status::text
    )
    RETURNING id INTO _session_id;

    PERFORM public.record_audit_event(
      _tok.organization_id, _uid, 'access.session_blocked', 'access_session', _session_id,
      jsonb_build_object('token_id', _tok.id, 'reason', 'token_' || _tok.status::text),
      NULL, NULL
    );
    RETURN QUERY SELECT _session_id, NULL::uuid, 'blocked'::public.access_session_status,
                        ('token_' || _tok.status::text), NULL::text, NULL::int;
    RETURN;
  END IF;

  IF _tok.target_type = 'space' THEN
    SELECT * INTO _space FROM public.reservable_spaces WHERE id = _tok.target_id FOR UPDATE;
    IF _space.id IS NULL THEN
      RAISE EXCEPTION 'space not found';
    END IF;
  END IF;

  SELECT p.decision, p.reason, p.rule_applied, p.attempt_id
    INTO _decision, _reason, _rule, _attempt_id
    FROM public.process_access_attempt(
      _tok.event_id, _sub_type, _sub_id, _tok.target_type, _tok.target_id
    ) AS p;

  IF _decision <> 'allowed' THEN
    INSERT INTO public.access_sessions (
      event_id, organization_id, token_id,
      space_id, sector_id, subject_type, subject_id,
      attempt_id, status, reason
    ) VALUES (
      _tok.event_id, _tok.organization_id, _tok.id,
      CASE WHEN _tok.target_type = 'space' THEN _tok.target_id END,
      CASE WHEN _tok.target_type = 'sector' THEN _tok.target_id END,
      _sub_type, _sub_id, _attempt_id,
      'blocked', _reason
    )
    RETURNING id INTO _session_id;

    PERFORM public.record_audit_event(
      _tok.organization_id, _uid, 'access.session_blocked', 'access_session', _session_id,
      jsonb_build_object('token_id', _tok.id, 'attempt_id', _attempt_id, 'reason', _reason, 'rule', _rule),
      NULL, NULL
    );
    RETURN QUERY SELECT _session_id, _attempt_id, 'blocked'::public.access_session_status,
                        _reason, _rule, NULL::int;
    RETURN;
  END IF;

  _effective_cap := NULL;
  IF _tok.target_type = 'space' AND _space.capacity IS NOT NULL THEN
    _effective_cap := _space.capacity;
  END IF;
  IF _tok.capacity_limit IS NOT NULL THEN
    IF _effective_cap IS NULL OR _tok.capacity_limit < _effective_cap THEN
      _effective_cap := _tok.capacity_limit;
    END IF;
  END IF;

  IF _effective_cap IS NOT NULL THEN
    IF _tok.target_type = 'space' THEN
      SELECT count(*) INTO _active_count FROM public.access_sessions AS s
        WHERE s.space_id = _tok.target_id AND s.status = 'active';
    ELSE
      _active_count := _tok.usage_count;
    END IF;

    IF _active_count >= _effective_cap THEN
      INSERT INTO public.access_sessions (
        event_id, organization_id, token_id,
        space_id, sector_id, subject_type, subject_id,
        attempt_id, status, reason
      ) VALUES (
        _tok.event_id, _tok.organization_id, _tok.id,
        CASE WHEN _tok.target_type = 'space' THEN _tok.target_id END,
        CASE WHEN _tok.target_type = 'sector' THEN _tok.target_id END,
        _sub_type, _sub_id, _attempt_id,
        'blocked', 'capacity_reached'
      )
      RETURNING id INTO _session_id;

      PERFORM public.record_audit_event(
        _tok.organization_id, _uid, 'access.session_blocked', 'access_session', _session_id,
        jsonb_build_object('token_id', _tok.id, 'reason', 'capacity_reached', 'capacity', _effective_cap),
        NULL, NULL
      );
      RETURN QUERY SELECT _session_id, _attempt_id, 'blocked'::public.access_session_status,
                          'capacity_reached'::text, _rule, 0;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.access_sessions (
    event_id, organization_id, token_id,
    space_id, sector_id, subject_type, subject_id,
    attempt_id, status
  ) VALUES (
    _tok.event_id, _tok.organization_id, _tok.id,
    CASE WHEN _tok.target_type = 'space' THEN _tok.target_id END,
    CASE WHEN _tok.target_type = 'sector' THEN _tok.target_id END,
    _sub_type, _sub_id, _attempt_id,
    'active'
  )
  RETURNING id INTO _session_id;

  UPDATE public.access_tokens AS t
    SET usage_count = t.usage_count + 1
    WHERE t.id = _tok.id;

  IF _tok.capacity_limit IS NOT NULL AND (_tok.usage_count + 1) >= _tok.capacity_limit THEN
    UPDATE public.access_tokens AS t
      SET status = 'expired'
      WHERE t.id = _tok.id AND t.status = 'active';
  END IF;

  IF _effective_cap IS NOT NULL THEN
    _remaining := _effective_cap - (_active_count + 1);
  ELSE
    _remaining := NULL;
  END IF;

  PERFORM public.record_audit_event(
    _tok.organization_id, _uid, 'access.session_created', 'access_session', _session_id,
    jsonb_build_object(
      'token_id', _tok.id, 'attempt_id', _attempt_id,
      'target_type', _tok.target_type, 'target_id', _tok.target_id,
      'remaining_capacity', _remaining
    ), NULL, NULL
  );

  IF _effective_cap IS NOT NULL THEN
    PERFORM public.record_audit_event(
      _tok.organization_id, _uid, 'capacity.updated', 'access_token', _tok.id,
      jsonb_build_object('capacity', _effective_cap, 'remaining', _remaining), NULL, NULL
    );
  END IF;

  RETURN QUERY SELECT _session_id, _attempt_id, 'active'::public.access_session_status,
                      NULL::text, _rule, _remaining;
END;
$function$;