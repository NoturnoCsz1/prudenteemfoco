DO $$ BEGIN
  CREATE TYPE public.event_kind AS ENUM ('festival', 'show', 'special_event', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.event_format AS ENUM ('recurring', 'one_off');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS kind public.event_kind NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS format public.event_format NOT NULL DEFAULT 'one_off';

CREATE INDEX IF NOT EXISTS idx_events_kind ON public.events(kind);
CREATE INDEX IF NOT EXISTS idx_events_format ON public.events(format);

UPDATE public.events
   SET kind = 'festival', format = 'recurring'
 WHERE slug = 'expo-prudente-2026';

DROP FUNCTION IF EXISTS public.list_published_events();
DROP FUNCTION IF EXISTS public.get_published_event_by_slug(text);

CREATE FUNCTION public.list_published_events()
 RETURNS TABLE(title text, slug text, starts_at timestamp with time zone, ends_at timestamp with time zone, venue_name text, city text, short_description text, cover_image_url text, long_description text, instagram_url text, external_ticket_url text, kind public.event_kind, format public.event_format)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.title, e.slug, e.starts_at, e.ends_at,
         e.venue_name, e.city, e.short_description, e.cover_image_url,
         e.long_description, e.instagram_url, e.external_ticket_url,
         e.kind, e.format
  FROM public.events e
  WHERE e.status = 'published'
  ORDER BY e.starts_at ASC NULLS LAST;
$function$;

CREATE FUNCTION public.get_published_event_by_slug(_slug text)
 RETURNS TABLE(title text, slug text, starts_at timestamp with time zone, ends_at timestamp with time zone, venue_name text, city text, short_description text, cover_image_url text, long_description text, instagram_url text, external_ticket_url text, kind public.event_kind, format public.event_format)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.title, e.slug, e.starts_at, e.ends_at,
         e.venue_name, e.city, e.short_description, e.cover_image_url,
         e.long_description, e.instagram_url, e.external_ticket_url,
         e.kind, e.format
  FROM public.events e
  WHERE e.status = 'published' AND e.slug = _slug
  LIMIT 1;
$function$;
