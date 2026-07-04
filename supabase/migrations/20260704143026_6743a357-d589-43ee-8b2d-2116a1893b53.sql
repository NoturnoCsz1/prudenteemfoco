
-- Remove claim_first_owner (auto-privilege escalation) and add owner-managed team RPCs.

DROP FUNCTION IF EXISTS public.claim_first_owner(text);

-- Invite an existing auth user to the caller's org (owner-only).
-- Looks up by email via public.profiles. Fails if user hasn't registered yet.
CREATE OR REPLACE FUNCTION public.invite_org_member(
  _org_id uuid,
  _email text,
  _role public.member_role
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _target_user uuid;
  _member_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF _role = 'owner' THEN RAISE EXCEPTION 'cannot assign owner role'; END IF;
  IF NOT public.has_org_role_at_least(_uid, _org_id, 'owner'::public.member_role) THEN
    RAISE EXCEPTION 'forbidden: owner only';
  END IF;

  SELECT user_id INTO _target_user FROM public.profiles WHERE lower(email) = lower(_email) LIMIT 1;
  IF _target_user IS NULL THEN
    RAISE EXCEPTION 'user not found: ask them to sign up first';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (_org_id, _target_user, _role, 'active')
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET role = EXCLUDED.role, status = 'active'
  RETURNING id INTO _member_id;

  PERFORM public.record_audit_event(
    _org_id, _uid, 'member.invited', 'organization_member', _member_id,
    jsonb_build_object('email', _email, 'role', _role), NULL, NULL
  );
  RETURN _member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_org_member(uuid, text, public.member_role) TO authenticated;

-- Change a member's role (owner-only). Cannot promote to or demote from owner.
CREATE OR REPLACE FUNCTION public.update_member_role(
  _member_id uuid,
  _role public.member_role
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
  _current_role public.member_role;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF _role = 'owner' THEN RAISE EXCEPTION 'cannot assign owner role'; END IF;

  SELECT organization_id, role INTO _org_id, _current_role
  FROM public.organization_members WHERE id = _member_id;
  IF _org_id IS NULL THEN RAISE EXCEPTION 'member not found'; END IF;
  IF _current_role = 'owner' THEN RAISE EXCEPTION 'cannot modify owner'; END IF;

  IF NOT public.has_org_role_at_least(_uid, _org_id, 'owner'::public.member_role) THEN
    RAISE EXCEPTION 'forbidden: owner only';
  END IF;

  UPDATE public.organization_members SET role = _role WHERE id = _member_id;

  PERFORM public.record_audit_event(
    _org_id, _uid, 'member.role_changed', 'organization_member', _member_id,
    jsonb_build_object('new_role', _role), NULL, NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_role(uuid, public.member_role) TO authenticated;

-- Remove a member (owner-only). Cannot remove owner.
CREATE OR REPLACE FUNCTION public.remove_org_member(_member_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
  _current_role public.member_role;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  SELECT organization_id, role INTO _org_id, _current_role
  FROM public.organization_members WHERE id = _member_id;
  IF _org_id IS NULL THEN RAISE EXCEPTION 'member not found'; END IF;
  IF _current_role = 'owner' THEN RAISE EXCEPTION 'cannot remove owner'; END IF;

  IF NOT public.has_org_role_at_least(_uid, _org_id, 'owner'::public.member_role) THEN
    RAISE EXCEPTION 'forbidden: owner only';
  END IF;

  DELETE FROM public.organization_members WHERE id = _member_id;

  PERFORM public.record_audit_event(
    _org_id, _uid, 'member.removed', 'organization_member', _member_id,
    '{}'::jsonb, NULL, NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_org_member(uuid) TO authenticated;
