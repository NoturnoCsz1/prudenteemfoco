-- Fase 5: Access Engine — motor de decisão de acesso (sem entrada física, sem QR, sem scanner)

-- Enums
CREATE TYPE public.access_subject_type AS ENUM ('invite', 'credential', 'user');
CREATE TYPE public.access_target_type AS ENUM ('event', 'sector', 'space');
CREATE TYPE public.access_attempt_status AS ENUM ('processing', 'allowed', 'denied');

-- Tabela principal
CREATE TABLE public.access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  subject_type public.access_subject_type NOT NULL,
  subject_id uuid NOT NULL,
  target_type public.access_target_type NOT NULL,
  target_id uuid NOT NULL,
  status public.access_attempt_status NOT NULL DEFAULT 'processing',
  decision_reason text,
  rule_applied text,
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CONSTRAINT access_attempts_event_org_fk
    FOREIGN KEY (event_id, organization_id)
    REFERENCES public.events (id, organization_id) ON DELETE CASCADE
);
CREATE INDEX access_attempts_event_idx ON public.access_attempts (event_id);
CREATE INDEX access_attempts_org_idx ON public.access_attempts (organization_id);
CREATE INDEX access_attempts_subject_idx ON public.access_attempts (subject_type, subject_id);
CREATE INDEX access_attempts_created_idx ON public.access_attempts (created_at DESC);

GRANT SELECT ON public.access_attempts TO authenticated;
GRANT ALL ON public.access_attempts TO service_role;

ALTER TABLE public.access_attempts ENABLE ROW LEVEL SECURITY;

-- Leitura por membros ativos da organização; escrita apenas via função SECURITY DEFINER
CREATE POLICY "attempts_read_members" ON public.access_attempts
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

-- Cache de decisão (opcional, TTL curto)
CREATE TABLE public.access_decision_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  subject_type public.access_subject_type NOT NULL,
  subject_id uuid NOT NULL,
  target_type public.access_target_type NOT NULL,
  target_id uuid NOT NULL,
  decision public.access_attempt_status NOT NULL,
  decision_reason text,
  rule_applied text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_cache_event_org_fk
    FOREIGN KEY (event_id, organization_id)
    REFERENCES public.events (id, organization_id) ON DELETE CASCADE,
  CONSTRAINT access_cache_uniq UNIQUE (event_id, subject_type, subject_id, target_type, target_id)
);
CREATE INDEX access_cache_exp_idx ON public.access_decision_cache (expires_at);

GRANT SELECT ON public.access_decision_cache TO authenticated;
GRANT ALL ON public.access_decision_cache TO service_role;
ALTER TABLE public.access_decision_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cache_read_members" ON public.access_decision_cache
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

-- Motor de decisão
CREATE OR REPLACE FUNCTION public.process_access_attempt(
  _event_id uuid,
  _subject_type public.access_subject_type,
  _subject_id uuid,
  _target_type public.access_target_type,
  _target_id uuid
)
RETURNS TABLE (
  attempt_id uuid,
  decision public.access_attempt_status,
  reason text,
  rule_applied text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
  _attempt_id uuid;
  _decision public.access_attempt_status := 'denied';
  _reason text := 'no_rule_matched';
  _rule text := 'default_deny';
  _subject_org uuid;
  _subject_event uuid;
  _subject_status text;
  _target_org uuid;
  _target_event uuid;
  _deny_rule_count int := 0;
  _allow_rule_count int := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- Resolver organização do evento
  SELECT organization_id INTO _org_id FROM public.events WHERE id = _event_id;
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  -- Autorização: apenas membros ativos podem simular/processar
  IF NOT public.is_active_org_member(_uid, _org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Cria attempt em processing
  INSERT INTO public.access_attempts (
    event_id, organization_id, subject_type, subject_id,
    target_type, target_id, status, requested_by
  ) VALUES (
    _event_id, _org_id, _subject_type, _subject_id,
    _target_type, _target_id, 'processing', _uid
  )
  RETURNING id INTO _attempt_id;

  PERFORM public.record_audit_event(
    _org_id, _uid, 'access.attempt_created', 'access_attempt', _attempt_id,
    jsonb_build_object(
      'subject_type', _subject_type, 'subject_id', _subject_id,
      'target_type', _target_type, 'target_id', _target_id
    ), NULL, NULL
  );

  -- Validar existência e coerência do TARGET
  IF _target_type = 'event' THEN
    IF _target_id <> _event_id THEN
      _decision := 'denied'; _reason := 'target_event_mismatch'; _rule := 'coherence';
    ELSE
      _target_org := _org_id; _target_event := _event_id;
    END IF;
  ELSIF _target_type = 'sector' THEN
    SELECT organization_id, event_id INTO _target_org, _target_event
      FROM public.event_sectors WHERE id = _target_id;
    IF _target_org IS NULL THEN
      _decision := 'denied'; _reason := 'target_not_found'; _rule := 'coherence';
    ELSIF _target_event <> _event_id THEN
      _decision := 'denied'; _reason := 'target_event_mismatch'; _rule := 'coherence';
    END IF;
  ELSIF _target_type = 'space' THEN
    SELECT organization_id, event_id INTO _target_org, _target_event
      FROM public.reservable_spaces WHERE id = _target_id;
    IF _target_org IS NULL THEN
      _decision := 'denied'; _reason := 'target_not_found'; _rule := 'coherence';
    ELSIF _target_event <> _event_id THEN
      _decision := 'denied'; _reason := 'target_event_mismatch'; _rule := 'coherence';
    END IF;
  END IF;

  -- Validar SUBJECT e aplicar hierarquia (owner/admin > manager > credential > invite > user)
  IF _reason = 'no_rule_matched' THEN
    IF _subject_type = 'user' THEN
      -- Hierarquia por role
      IF public.has_org_role_at_least(_subject_id, _org_id, 'admin'::public.member_role) THEN
        _decision := 'allowed'; _reason := 'user_is_admin_or_owner'; _rule := 'role_admin_plus';
      ELSIF public.has_org_role_at_least(_subject_id, _org_id, 'manager'::public.member_role) THEN
        -- manager: verifica regras deny específicas
        SELECT count(*) INTO _deny_rule_count
          FROM public.event_access_rules r
          WHERE r.event_id = _event_id
            AND r.rule_type = 'deny'
            AND r.target = _target_type::text::public.access_rule_target
            AND (r.conditions->>'target_id' IS NULL OR (r.conditions->>'target_id')::uuid = _target_id)
            AND (r.conditions->>'subject_id' IS NULL OR (r.conditions->>'subject_id')::uuid = _subject_id);
        IF _deny_rule_count > 0 THEN
          _decision := 'denied'; _reason := 'explicit_deny_rule'; _rule := 'rule_deny';
        ELSE
          _decision := 'allowed'; _reason := 'user_is_manager'; _rule := 'role_manager';
        END IF;
      ELSIF public.is_active_org_member(_subject_id, _org_id) THEN
        -- operator/viewer: precisa de regra allow explícita
        SELECT count(*) INTO _allow_rule_count
          FROM public.event_access_rules r
          WHERE r.event_id = _event_id
            AND r.rule_type = 'allow'
            AND r.target = _target_type::text::public.access_rule_target
            AND (r.conditions->>'subject_id')::uuid = _subject_id;
        IF _allow_rule_count > 0 THEN
          _decision := 'allowed'; _reason := 'explicit_allow_rule'; _rule := 'rule_allow';
        ELSE
          _decision := 'denied'; _reason := 'insufficient_role'; _rule := 'fail_safe';
        END IF;
      ELSE
        _decision := 'denied'; _reason := 'not_a_member'; _rule := 'fail_safe';
      END IF;

    ELSIF _subject_type = 'credential' THEN
      SELECT organization_id, event_id, status::text
        INTO _subject_org, _subject_event, _subject_status
        FROM public.event_credentials WHERE id = _subject_id;
      IF _subject_org IS NULL THEN
        _decision := 'denied'; _reason := 'subject_not_found'; _rule := 'coherence';
      ELSIF _subject_event <> _event_id THEN
        _decision := 'denied'; _reason := 'subject_event_mismatch'; _rule := 'coherence';
      ELSIF _subject_status <> 'active' THEN
        _decision := 'denied'; _reason := 'credential_inactive'; _rule := 'subject_status';
      ELSE
        SELECT count(*) INTO _deny_rule_count
          FROM public.event_access_rules r
          WHERE r.event_id = _event_id
            AND r.rule_type = 'deny'
            AND r.target = _target_type::text::public.access_rule_target
            AND (r.conditions->>'target_id' IS NULL OR (r.conditions->>'target_id')::uuid = _target_id)
            AND (r.conditions->>'subject_id' IS NULL OR (r.conditions->>'subject_id')::uuid = _subject_id);
        IF _deny_rule_count > 0 THEN
          _decision := 'denied'; _reason := 'explicit_deny_rule'; _rule := 'rule_deny';
        ELSE
          _decision := 'allowed'; _reason := 'credential_active'; _rule := 'credential_priority';
        END IF;
      END IF;

    ELSIF _subject_type = 'invite' THEN
      SELECT organization_id, event_id, status::text
        INTO _subject_org, _subject_event, _subject_status
        FROM public.event_invites WHERE id = _subject_id;
      IF _subject_org IS NULL THEN
        _decision := 'denied'; _reason := 'subject_not_found'; _rule := 'coherence';
      ELSIF _subject_event <> _event_id THEN
        _decision := 'denied'; _reason := 'subject_event_mismatch'; _rule := 'coherence';
      ELSIF _subject_status <> 'active' THEN
        _decision := 'denied'; _reason := 'invite_not_active'; _rule := 'subject_status';
      ELSE
        -- invite: só permite acesso a event ou allow explícito para sector/space
        IF _target_type = 'event' THEN
          _decision := 'allowed'; _reason := 'invite_valid_for_event'; _rule := 'invite_default';
        ELSE
          SELECT count(*) INTO _allow_rule_count
            FROM public.event_access_rules r
            WHERE r.event_id = _event_id
              AND r.rule_type = 'allow'
              AND r.target = _target_type::text::public.access_rule_target
              AND (r.conditions->>'target_id' IS NULL OR (r.conditions->>'target_id')::uuid = _target_id)
              AND (r.conditions->>'subject_id' IS NULL OR (r.conditions->>'subject_id')::uuid = _subject_id);
          IF _allow_rule_count > 0 THEN
            _decision := 'allowed'; _reason := 'invite_allow_rule'; _rule := 'rule_allow';
          ELSE
            _decision := 'denied'; _reason := 'invite_scope_restricted'; _rule := 'fail_safe';
          END IF;
        END IF;
        -- deny explícito sempre sobrepõe
        SELECT count(*) INTO _deny_rule_count
          FROM public.event_access_rules r
          WHERE r.event_id = _event_id
            AND r.rule_type = 'deny'
            AND r.target = _target_type::text::public.access_rule_target
            AND (r.conditions->>'target_id' IS NULL OR (r.conditions->>'target_id')::uuid = _target_id)
            AND (r.conditions->>'subject_id' IS NULL OR (r.conditions->>'subject_id')::uuid = _subject_id);
        IF _deny_rule_count > 0 THEN
          _decision := 'denied'; _reason := 'explicit_deny_rule'; _rule := 'rule_deny';
        END IF;
      END IF;
    END IF;
  END IF;

  -- Persistir decisão
  UPDATE public.access_attempts
    SET status = _decision, decision_reason = _reason, rule_applied = _rule, decided_at = now()
    WHERE id = _attempt_id;

  -- Cache curto (60s)
  INSERT INTO public.access_decision_cache (
    event_id, organization_id, subject_type, subject_id,
    target_type, target_id, decision, decision_reason, rule_applied, expires_at
  ) VALUES (
    _event_id, _org_id, _subject_type, _subject_id,
    _target_type, _target_id, _decision, _reason, _rule, now() + interval '60 seconds'
  )
  ON CONFLICT (event_id, subject_type, subject_id, target_type, target_id)
  DO UPDATE SET decision = EXCLUDED.decision,
                decision_reason = EXCLUDED.decision_reason,
                rule_applied = EXCLUDED.rule_applied,
                expires_at = EXCLUDED.expires_at,
                created_at = now();

  PERFORM public.record_audit_event(
    _org_id, _uid,
    CASE WHEN _decision = 'allowed' THEN 'access.allowed' ELSE 'access.denied' END,
    'access_attempt', _attempt_id,
    jsonb_build_object(
      'subject_type', _subject_type, 'subject_id', _subject_id,
      'target_type', _target_type, 'target_id', _target_id,
      'decision', _decision, 'reason', _reason, 'rule_applied', _rule
    ), NULL, NULL
  );

  RETURN QUERY SELECT _attempt_id, _decision, _reason, _rule;
END;
$$;

REVOKE ALL ON FUNCTION public.process_access_attempt(uuid, public.access_subject_type, uuid, public.access_target_type, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_access_attempt(uuid, public.access_subject_type, uuid, public.access_target_type, uuid) TO authenticated;
