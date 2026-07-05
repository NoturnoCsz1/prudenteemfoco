CREATE OR REPLACE FUNCTION public.list_home_featured_events()
 RETURNS TABLE(title text, slug text, starts_at timestamp with time zone, ends_at timestamp with time zone, venue_name text, city text, short_description text, cover_image_url text, kind event_kind, format event_format, is_featured boolean, featured_order integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _has_featured boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.events e
    WHERE e.status = 'published' AND e.is_featured = true
  ) INTO _has_featured;

  IF _has_featured THEN
    RETURN QUERY
      SELECT e.title, e.slug, e.starts_at, e.ends_at,
             e.venue_name, e.city, e.short_description, e.cover_image_url,
             e.kind, e.format, e.is_featured, e.featured_order
      FROM public.events e
      WHERE e.status = 'published' AND e.is_featured = true
      ORDER BY e.featured_order ASC NULLS LAST, e.starts_at ASC NULLS LAST;
  ELSE
    RETURN QUERY
      SELECT e.title, e.slug, e.starts_at, e.ends_at,
             e.venue_name, e.city, e.short_description, e.cover_image_url,
             e.kind, e.format, e.is_featured, e.featured_order
      FROM public.events e
      WHERE e.status = 'published'
        AND (e.starts_at IS NULL OR e.starts_at >= now() - interval '6 hours')
      ORDER BY e.starts_at ASC NULLS LAST
      LIMIT 1;
  END IF;
END;
$function$;