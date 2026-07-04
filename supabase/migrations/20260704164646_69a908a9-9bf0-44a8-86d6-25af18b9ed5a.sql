
DROP FUNCTION IF EXISTS public.list_published_events();
DROP FUNCTION IF EXISTS public.get_published_event_by_slug(text);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS long_description    text,
  ADD COLUMN IF NOT EXISTS instagram_url       text,
  ADD COLUMN IF NOT EXISTS external_ticket_url text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_instagram_url_https') THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_instagram_url_https
        CHECK (instagram_url IS NULL OR instagram_url ~* '^https://[^\s"<>]+$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_external_ticket_url_https') THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_external_ticket_url_https
        CHECK (external_ticket_url IS NULL OR external_ticket_url ~* '^https://[^\s"<>]+$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_long_description_len') THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_long_description_len
        CHECK (long_description IS NULL OR char_length(long_description) <= 8000);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.event_attractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
  performs_on date,
  sort_order int NOT NULL DEFAULT 0,
  image_url text CHECK (image_url IS NULL OR image_url ~* '^https://[^\s"<>]+$'),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_attractions_event
  ON public.event_attractions(event_id, performs_on, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attractions TO authenticated;
GRANT ALL ON public.event_attractions TO service_role;

ALTER TABLE public.event_attractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members read attractions" ON public.event_attractions;
CREATE POLICY "org members read attractions"
  ON public.event_attractions FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "manager+ manage attractions" ON public.event_attractions;
CREATE POLICY "manager+ manage attractions"
  ON public.event_attractions FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

DROP POLICY IF EXISTS "manager+ update attractions" ON public.event_attractions;
CREATE POLICY "manager+ update attractions"
  ON public.event_attractions FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

DROP POLICY IF EXISTS "admin+ delete attractions" ON public.event_attractions;
CREATE POLICY "admin+ delete attractions"
  ON public.event_attractions FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

DROP TRIGGER IF EXISTS trg_event_attractions_updated_at ON public.event_attractions;
CREATE TRIGGER trg_event_attractions_updated_at
  BEFORE UPDATE ON public.event_attractions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE FUNCTION public.list_published_events()
 RETURNS TABLE(title text, slug text, starts_at timestamptz, ends_at timestamptz,
               venue_name text, city text, short_description text, cover_image_url text,
               long_description text, instagram_url text, external_ticket_url text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT e.title, e.slug, e.starts_at, e.ends_at,
         e.venue_name, e.city, e.short_description, e.cover_image_url,
         e.long_description, e.instagram_url, e.external_ticket_url
  FROM public.events e
  WHERE e.status = 'published'
  ORDER BY e.starts_at ASC NULLS LAST;
$$;

CREATE FUNCTION public.get_published_event_by_slug(_slug text)
 RETURNS TABLE(title text, slug text, starts_at timestamptz, ends_at timestamptz,
               venue_name text, city text, short_description text, cover_image_url text,
               long_description text, instagram_url text, external_ticket_url text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT e.title, e.slug, e.starts_at, e.ends_at,
         e.venue_name, e.city, e.short_description, e.cover_image_url,
         e.long_description, e.instagram_url, e.external_ticket_url
  FROM public.events e
  WHERE e.status = 'published' AND e.slug = _slug
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.list_event_attractions_by_slug(_slug text)
 RETURNS TABLE(id uuid, name text, performs_on date, sort_order int, image_url text, notes text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT a.id, a.name, a.performs_on, a.sort_order, a.image_url, a.notes
  FROM public.events e
  JOIN public.event_attractions a ON a.event_id = e.id
  WHERE e.status = 'published' AND e.slug = _slug
  ORDER BY a.performs_on ASC NULLS LAST, a.sort_order ASC, a.name ASC;
$$;

-- Seed Expo Prudente 2026 (check-then-insert; slug has no unique constraint)
DO $$
DECLARE
  _org_id uuid := 'e8601fa1-d1a1-48aa-92e9-cfbbae1df7b7';
  _event_id uuid;
BEGIN
  SELECT id INTO _event_id FROM public.events WHERE slug = 'expo-prudente-2026' LIMIT 1;
  IF _event_id IS NULL THEN
    INSERT INTO public.events (
      organization_id, title, slug, status,
      starts_at, ends_at, city,
      short_description, instagram_url
    ) VALUES (
      _org_id,
      'Expo Prudente 2026',
      'expo-prudente-2026',
      'published',
      '2026-09-10T20:00:00-03:00'::timestamptz,
      '2026-09-14T23:59:00-03:00'::timestamptz,
      'Presidente Prudente',
      'De 10 a 14 de setembro de 2026, em Presidente Prudente — SP. Cinco dias de shows nacionais, experiências, gastronomia e camarotes.',
      'https://instagram.com/expoprudente2026oficial'
    )
    RETURNING id INTO _event_id;
  ELSE
    UPDATE public.events SET
      status = 'published',
      starts_at = '2026-09-10T20:00:00-03:00'::timestamptz,
      ends_at   = '2026-09-14T23:59:00-03:00'::timestamptz,
      city = 'Presidente Prudente',
      short_description = COALESCE(short_description,
        'De 10 a 14 de setembro de 2026, em Presidente Prudente — SP. Cinco dias de shows nacionais, experiências, gastronomia e camarotes.'),
      instagram_url = COALESCE(instagram_url, 'https://instagram.com/expoprudente2026oficial')
    WHERE id = _event_id;
  END IF;

  DELETE FROM public.event_attractions WHERE event_id = _event_id;
  INSERT INTO public.event_attractions (organization_id, event_id, name, performs_on, sort_order) VALUES
    (_org_id, _event_id, 'Leonardo',                   '2026-09-10', 10),
    (_org_id, _event_id, 'Antony & Gabriel',           '2026-09-11', 10),
    (_org_id, _event_id, 'Loubet',                     '2026-09-11', 20),
    (_org_id, _event_id, 'Ícaro & Gilmar',             '2026-09-12', 10),
    (_org_id, _event_id, 'Panda',                      '2026-09-12', 20),
    (_org_id, _event_id, 'MC Hariel',                  '2026-09-12', 30),
    (_org_id, _event_id, 'Pedro Sanches & Thiago',     '2026-09-12', 40),
    (_org_id, _event_id, 'Zé Neto & Cristiano',        '2026-09-13', 10),
    (_org_id, _event_id, 'Zezé Di Camargo & Luciano',  '2026-09-14', 10),
    (_org_id, _event_id, 'Mariana Fagundes',           '2026-09-14', 20);
END $$;
