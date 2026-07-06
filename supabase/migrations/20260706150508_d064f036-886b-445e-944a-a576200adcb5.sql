CREATE OR REPLACE FUNCTION public.list_home_featured_events()
 RETURNS TABLE(title text, slug text, starts_at timestamp with time zone, ends_at timestamp with time zone, venue_name text, city text, short_description text, cover_image_url text, kind event_kind, format event_format, is_featured boolean, featured_order integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
    WITH ranked AS (
      SELECT
        e.title, e.slug, e.starts_at, e.ends_at,
        e.venue_name, e.city, e.short_description, e.cover_image_url,
        e.kind, e.format, e.is_featured, e.featured_order,
        CASE WHEN e.is_featured THEN 0 ELSE 1 END AS bucket
      FROM public.events e
      WHERE e.status = 'published'
        AND (
          e.is_featured = true
          OR e.starts_at IS NULL
          OR e.starts_at >= now() - interval '6 hours'
        )
    )
    SELECT r.title, r.slug, r.starts_at, r.ends_at,
           r.venue_name, r.city, r.short_description, r.cover_image_url,
           r.kind, r.format, r.is_featured, r.featured_order
    FROM ranked r
    ORDER BY
      r.bucket ASC,
      r.featured_order ASC NULLS LAST,
      r.starts_at ASC NULLS LAST
    LIMIT 5;
END;
$function$;