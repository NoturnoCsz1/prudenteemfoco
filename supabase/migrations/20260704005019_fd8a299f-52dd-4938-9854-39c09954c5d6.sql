
-- Phase 2.1: Public projection of events (remove anon direct access)

-- 1) Remove direct anon access to admin table
DROP POLICY IF EXISTS "events_select_public_published" ON public.events;
REVOKE SELECT ON public.events FROM anon;

-- 2) Public projection RPCs (SECURITY DEFINER, published-only, safe columns only)

CREATE OR REPLACE FUNCTION public.list_published_events()
RETURNS TABLE (
  title text,
  slug text,
  starts_at timestamptz,
  ends_at timestamptz,
  venue_name text,
  city text,
  short_description text,
  cover_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.title, e.slug, e.starts_at, e.ends_at,
         e.venue_name, e.city, e.short_description, e.cover_image_url
  FROM public.events e
  WHERE e.status = 'published'
  ORDER BY e.starts_at ASC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.get_published_event_by_slug(_slug text)
RETURNS TABLE (
  title text,
  slug text,
  starts_at timestamptz,
  ends_at timestamptz,
  venue_name text,
  city text,
  short_description text,
  cover_image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.title, e.slug, e.starts_at, e.ends_at,
         e.venue_name, e.city, e.short_description, e.cover_image_url
  FROM public.events e
  WHERE e.status = 'published'
    AND e.slug = _slug
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.list_published_events() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_published_event_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_published_events() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_published_event_by_slug(text) TO anon, authenticated;

-- 3) Helper: check if an event's cover storage path belongs to the current user's manageable org
-- Path convention: {organization_id}/{event_id}/{filename}
CREATE OR REPLACE FUNCTION public.can_manage_event_cover(_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
BEGIN
  IF auth.uid() IS NULL OR _path IS NULL THEN
    RETURN false;
  END IF;
  BEGIN
    _org_id := split_part(_path, '/', 1)::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  RETURN public.has_org_role_at_least(auth.uid(), _org_id, 'manager'::public.member_role);
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_event_cover(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_event_cover(text) TO authenticated;
