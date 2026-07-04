
-- Phase 2: Institutional events core

-- 1) Seed the main organization (idempotent)
INSERT INTO public.organizations (name, slug, type, status)
VALUES ('Prudente em Foco', 'prudente-em-foco', 'institutional', 'active')
ON CONFLICT (slug) DO NOTHING;

-- 2) Public read policy for published events (anon + authenticated)
GRANT SELECT ON public.events TO anon;

DROP POLICY IF EXISTS "events_select_public_published" ON public.events;
CREATE POLICY "events_select_public_published"
  ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- 3) Helper: current user's active organization (first membership)
CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS TABLE (organization_id uuid, role public.member_role, status public.member_status)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.organization_id, m.role, m.status
  FROM public.organization_members m
  WHERE m.user_id = auth.uid()
    AND m.status = 'active'
  ORDER BY public.role_rank(m.role) DESC, m.created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_org() TO authenticated;

-- 4) Claim first owner: only works if the org has no active owner yet.
CREATE OR REPLACE FUNCTION public.claim_first_owner(_org_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _user_id uuid := auth.uid();
  _existing_owner_count int;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT id INTO _org_id FROM public.organizations WHERE slug = _org_slug;
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'organization not found: %', _org_slug;
  END IF;

  SELECT count(*) INTO _existing_owner_count
  FROM public.organization_members
  WHERE organization_id = _org_id
    AND role = 'owner'
    AND status = 'active';

  IF _existing_owner_count > 0 THEN
    RAISE EXCEPTION 'organization already has an owner';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (_org_id, _user_id, 'owner', 'active')
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET role = 'owner', status = 'active';

  PERFORM public.record_audit_event(
    _org_id, _user_id, 'org.claim_first_owner', 'organization', _org_id,
    jsonb_build_object('slug', _org_slug), NULL, NULL
  );

  RETURN _org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_first_owner(text) TO authenticated;
