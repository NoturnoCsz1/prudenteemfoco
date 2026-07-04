-- Fase 5.1: execução física do acesso

CREATE TYPE public.access_token_status AS ENUM ('active', 'revoked', 'expired');
CREATE TYPE public.access_session_status AS ENUM ('active', 'consumed', 'blocked');

-- Tokens (QR)
CREATE TABLE public.access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  target_type public.access_target_type NOT NULL,
  target_id uuid NOT NULL,
  subject_type public.access_subject_type,
  subject_id uuid,
  token_hash text NOT NULL,
  capacity_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  status public.access_token_status NOT NULL DEFAULT 'active',
  label text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT access_tokens_event_org_fk
    FOREIGN KEY (event_id, organization_id)
    REFERENCES public.events (id, organization_id) ON DELETE CASCADE,
  CONSTRAINT access_tokens_hash_uniq UNIQUE (token_hash),
  CONSTRAINT access_tokens_capacity_chk CHECK (capacity_limit IS NULL OR capacity_limit > 0),
  CONSTRAINT access_tokens_usage_chk CHECK (usage_count >= 0),
  CONSTRAINT access_tokens_label_chk CHECK (label IS NULL OR char_length(label) <= 120)
);
CREATE INDEX access_tokens_event_idx ON public.access_tokens (event_id);
CREATE INDEX access_tokens_target_idx ON public.access_tokens (target_type, target_id);
CREATE INDEX access_tokens_status_idx ON public.access_tokens (status);

GRANT SELECT ON public.access_tokens TO authenticated;
GRANT ALL ON public.access_tokens TO service_role;
ALTER TABLE public.access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tokens_read_members" ON public.access_tokens
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

-- Sessões (entradas)
CREATE TABLE public.access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  token_id uuid REFERENCES public.access_tokens(id) ON DELETE SET NULL,
  space_id uuid,
  sector_id uuid,
  subject_type public.access_subject_type NOT NULL,
  subject_id uuid NOT NULL,
  attempt_id uuid REFERENCES public.access_attempts(id) ON DELETE SET NULL,
  status public.access_session_status NOT NULL DEFAULT 'active',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  CONSTRAINT access_sessions_event_org_fk
    FOREIGN KEY (event_id, organization_id)
    REFERENCES public.events (id, organization_id) ON DELETE CASCADE
);
CREATE INDEX access_sessions_event_idx ON public.access_sessions (event_id);
CREATE INDEX access_sessions_space_idx ON public.access_sessions (space_id) WHERE space_id IS NOT NULL;
CREATE INDEX access_sessions_status_idx ON public.access_sessions (status);
CREATE INDEX access_sessions_created_idx ON public.access_sessions (created_at DESC);

GRANT SELECT ON public.access_sessions TO authenticated;
GRANT ALL ON public.access_sessions TO service_role;
ALTER TABLE public.access_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_read_members" ON public.access_sessions
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

-- Emitir token (retorna plaintext apenas uma vez)
CREATE OR REPLACE FUNCTION public.create_access_token(
  _event_id uuid,
  _target_type public.access_target_type,
  _target_id uuid,
  _subject_type public.access_subject_type DEFAULT NULL,
  _subject_id uuid DEFAULT NULL,
  _capacity_limit integer DEFAULT NULL,
  _label text DEFAULT NULL
)
RETURNS TABLE (token_id uuid, token_plain text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
  _plain text;
  _hash text;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  SELECT organization_id INTO _org_id FROM public.events WHERE id = _event_id;
  IF _org_id IS NULL THEN RAISE EXCEPTION 'event not found'; END IF;

  IF NOT public.has_org_role_at_least(_uid, _org_id, 'manager'::public.member_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _capacity_limit IS NOT NULL AND _capacity_limit < 1 THEN
    RAISE EXCEPTION 'capacity_limit must be >= 1';
  END IF;

  -- token aleatório 24 bytes -> 48 hex chars
  _plain := encode(extensions.gen_random_bytes(24), 'hex');
  _hash := encode(extensions.digest(_plain, 'sha256'), 'hex');

  INSERT INTO public.access_tokens (
    event_id, organization_id, target_type, target_id,
    subject_type, subject_id, token_hash, capacity_limit, label, created_by
  ) VALUES (
    _event_id, _org_id, _target_type, _target_id,
    _subject_type, _subject_id, _hash, _capacity_limit, _label, _uid
  )
  RETURNING id INTO _id;

  PERFORM public.record_audit_event(
    _org_id, _uid, 'token.created', 'access_token', _id,
    jsonb_build_object(
      'target_type', _target_type, 'target_id', _target_id,
      'capacity_limit', _capacity_limit, 'label', _label
    ), NULL, NULL
  );

  RETURN QUERY SELECT _id, _plain;
END;
$$;

REVOKE ALL ON FUNCTION public.create_access_token(uuid, public.access_target_type, uuid, public.access_subject_type, uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_access_token(uuid, public.access_target_type, uuid, public.access_subject_type, uuid, integer, text) TO authenticated;

-- Revogar token
CREATE OR REPLACE FUNCTION public.revoke_access_token(_token_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  SELECT organization_id INTO _org_id FROM public.access_tokens WHERE id = _token_id;
  IF _org_id IS NULL THEN RAISE EXCEPTION 'token not found'; END IF;

  IF NOT public.has_org_role_at_least(_uid, _org_id, 'manager'::public.member_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.access_tokens
    SET status = 'revoked', revoked_at = now()
    WHERE id = _token_id AND status = 'active';

  PERFORM public.record_audit_event(
    _org_id, _uid, 'token.revoked', 'access_token', _token_id,
    '{}'::jsonb, NULL, NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_access_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_access_token(uuid) TO authenticated;

-- Consumir token (fluxo QR completo, atômico)
CREATE OR REPLACE FUNCTION public.redeem_access_token(
  _token_plain text,
  _subject_type public.access_subject_type DEFAULT NULL,
  _subject_id uuid DEFAULT NULL
)
RETURNS TABLE (
  session_id uuid,
  attempt_id uuid,
  status public.access_session_status,
  reason text,
  rule_applied text,
  remaining_capacity integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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

  -- Lock token
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

  -- Subject: usa parâmetros ou o vínculo do token
  _sub_type := COALESCE(_subject_type, _tok.subject_type);
  _sub_id := COALESCE(_subject_id, _tok.subject_id);
  IF _sub_type IS NULL OR _sub_id IS NULL THEN
    _sub_type := 'user'; _sub_id := _uid;
  END IF;

  -- Token não ativo -> bloqueado
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

  -- Lock alvo se for space (para capacity)
  IF _tok.target_type = 'space' THEN
    SELECT * INTO _space FROM public.reservable_spaces WHERE id = _tok.target_id FOR UPDATE;
    IF _space.id IS NULL THEN
      RAISE EXCEPTION 'space not found';
    END IF;
  END IF;

  -- Consulta engine (Fase 5)
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

  -- Capacidade efetiva = min(space.capacity, token.capacity_limit) considerando NULLs
  _effective_cap := NULL;
  IF _tok.target_type = 'space' AND _space.capacity IS NOT NULL THEN
    _effective_cap := _space.capacity;
  END IF;
  IF _tok.capacity_limit IS NOT NULL THEN
    IF _effective_cap IS NULL OR _tok.capacity_limit < _effective_cap THEN
      _effective_cap := _tok.capacity_limit;
    END IF;
  END IF;

  -- Verificar consumo atual
  IF _effective_cap IS NOT NULL THEN
    IF _tok.target_type = 'space' THEN
      SELECT count(*) INTO _active_count FROM public.access_sessions
        WHERE space_id = _tok.target_id AND status = 'active';
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

  -- Criar sessão ativa
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

  UPDATE public.access_tokens
    SET usage_count = usage_count + 1
    WHERE id = _tok.id;

  -- Expirar token se atingiu capacity_limit próprio
  IF _tok.capacity_limit IS NOT NULL AND (_tok.usage_count + 1) >= _tok.capacity_limit THEN
    UPDATE public.access_tokens SET status = 'expired' WHERE id = _tok.id AND status = 'active';
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
$$;

REVOKE ALL ON FUNCTION public.redeem_access_token(text, public.access_subject_type, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_access_token(text, public.access_subject_type, uuid) TO authenticated;

-- Consumir sessão ativa (marcar como consumed)
CREATE OR REPLACE FUNCTION public.consume_access_session(_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  SELECT organization_id INTO _org_id FROM public.access_sessions WHERE id = _session_id FOR UPDATE;
  IF _org_id IS NULL THEN RAISE EXCEPTION 'session not found'; END IF;
  IF NOT public.has_org_role_at_least(_uid, _org_id, 'operator'::public.member_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.access_sessions
    SET status = 'consumed', consumed_at = now()
    WHERE id = _session_id AND status = 'active';
  PERFORM public.record_audit_event(
    _org_id, _uid, 'access.session_consumed', 'access_session', _session_id,
    '{}'::jsonb, NULL, NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_access_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_access_session(uuid) TO authenticated;
