
-- 1) events: destaque na Home
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_order integer;

CREATE INDEX IF NOT EXISTS idx_events_home_featured
  ON public.events (featured_order NULLS LAST, starts_at)
  WHERE status = 'published' AND is_featured = true;

-- 2) novos kinds da Home no enum hotsite_click_kind
ALTER TYPE public.hotsite_click_kind ADD VALUE IF NOT EXISTS 'home_hero_view';
ALTER TYPE public.hotsite_click_kind ADD VALUE IF NOT EXISTS 'home_hero_click';
ALTER TYPE public.hotsite_click_kind ADD VALUE IF NOT EXISTS 'home_event_card_click';
ALTER TYPE public.hotsite_click_kind ADD VALUE IF NOT EXISTS 'home_news_click';
ALTER TYPE public.hotsite_click_kind ADD VALUE IF NOT EXISTS 'home_experience_click';
ALTER TYPE public.hotsite_click_kind ADD VALUE IF NOT EXISTS 'home_agenda_click';
ALTER TYPE public.hotsite_click_kind ADD VALUE IF NOT EXISTS 'home_ticket_click';

-- 3) list_published_events e get_published_event_by_slug agora expõem is_featured / featured_order
DROP FUNCTION IF EXISTS public.list_published_events();
CREATE OR REPLACE FUNCTION public.list_published_events()
RETURNS TABLE(
  title text, slug text, starts_at timestamptz, ends_at timestamptz,
  venue_name text, city text, short_description text, cover_image_url text,
  long_description text, instagram_url text, external_ticket_url text,
  kind public.event_kind, format public.event_format,
  is_featured boolean, featured_order integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.title, e.slug, e.starts_at, e.ends_at,
         e.venue_name, e.city, e.short_description, e.cover_image_url,
         e.long_description, e.instagram_url, e.external_ticket_url,
         e.kind, e.format, e.is_featured, e.featured_order
  FROM public.events e
  WHERE e.status = 'published'
  ORDER BY e.starts_at ASC NULLS LAST;
$$;

DROP FUNCTION IF EXISTS public.get_published_event_by_slug(text);
CREATE OR REPLACE FUNCTION public.get_published_event_by_slug(_slug text)
RETURNS TABLE(
  title text, slug text, starts_at timestamptz, ends_at timestamptz,
  venue_name text, city text, short_description text, cover_image_url text,
  long_description text, instagram_url text, external_ticket_url text,
  kind public.event_kind, format public.event_format,
  is_featured boolean, featured_order integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.title, e.slug, e.starts_at, e.ends_at,
         e.venue_name, e.city, e.short_description, e.cover_image_url,
         e.long_description, e.instagram_url, e.external_ticket_url,
         e.kind, e.format, e.is_featured, e.featured_order
  FROM public.events e
  WHERE e.status = 'published' AND e.slug = _slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.list_published_events() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_published_event_by_slug(text) TO anon, authenticated;

-- 4) Home featured events: featured primeiro, senão próximo publicado futuro (fallback)
CREATE OR REPLACE FUNCTION public.list_home_featured_events()
RETURNS TABLE(
  title text, slug text, starts_at timestamptz, ends_at timestamptz,
  venue_name text, city text, short_description text, cover_image_url text,
  kind public.event_kind, format public.event_format,
  is_featured boolean, featured_order integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _has_featured boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.events
    WHERE status='published' AND is_featured=true
  ) INTO _has_featured;

  IF _has_featured THEN
    RETURN QUERY
      SELECT e.title, e.slug, e.starts_at, e.ends_at,
             e.venue_name, e.city, e.short_description, e.cover_image_url,
             e.kind, e.format, e.is_featured, e.featured_order
      FROM public.events e
      WHERE e.status='published' AND e.is_featured = true
      ORDER BY e.featured_order ASC NULLS LAST, e.starts_at ASC NULLS LAST;
  ELSE
    -- Fallback: próximo evento publicado futuro
    RETURN QUERY
      SELECT e.title, e.slug, e.starts_at, e.ends_at,
             e.venue_name, e.city, e.short_description, e.cover_image_url,
             e.kind, e.format, e.is_featured, e.featured_order
      FROM public.events e
      WHERE e.status='published'
        AND (e.starts_at IS NULL OR e.starts_at >= now() - interval '6 hours')
      ORDER BY e.starts_at ASC NULLS LAST
      LIMIT 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_home_featured_events() TO anon, authenticated;

-- 5) Home news cross-event: is_featured DESC, published_at DESC
CREATE OR REPLACE FUNCTION public.list_home_news(_limit integer DEFAULT 6)
RETURNS TABLE(
  id uuid, title text, slug text, excerpt text, image_url text,
  published_at timestamptz, is_featured boolean,
  event_slug text, event_title text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT n.id, n.title, n.slug, n.excerpt, n.image_url,
         n.published_at, n.is_featured,
         e.slug, e.title
  FROM public.event_news n
  JOIN public.events e ON e.id = n.event_id
  WHERE e.status = 'published'
    AND n.status = 'published'
    AND (n.published_at IS NULL OR n.published_at <= now())
  ORDER BY n.is_featured DESC, n.published_at DESC NULLS LAST, n.sort_order ASC
  LIMIT GREATEST(1, LEAST(coalesce(_limit, 6), 30));
$$;

GRANT EXECUTE ON FUNCTION public.list_home_news(integer) TO anon, authenticated;

-- 6) Home experiences cross-event: agregação por space_type ativo com pelo menos 1 unidade disponível
CREATE OR REPLACE FUNCTION public.list_home_experiences(_limit integer DEFAULT 6)
RETURNS TABLE(
  space_type_id uuid,
  event_slug text,
  event_title text,
  event_starts_at timestamptz,
  name text,
  category public.space_type_category,
  image_url text,
  base_price numeric,
  currency text,
  available_units integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    t.id,
    e.slug,
    e.title,
    e.starts_at,
    t.name,
    t.category,
    t.image_url,
    t.base_price,
    t.currency,
    COALESCE(u.available, 0)::int
  FROM public.reservable_space_types t
  JOIN public.events e ON e.id = t.event_id
  JOIN LATERAL (
    SELECT count(*) FILTER (
      WHERE s.commercial_status = 'available'
        AND s.operational_status = 'available'
    ) AS available
    FROM public.reservable_spaces s
    WHERE s.space_type_id = t.id
  ) u ON true
  WHERE e.status = 'published'
    AND t.status = 'active'
    AND (e.ends_at IS NULL OR e.ends_at >= now())
    AND u.available > 0
  ORDER BY
    CASE t.category
      WHEN 'camarote' THEN 1
      WHEN 'bistro' THEN 2
      WHEN 'mesa' THEN 3
      ELSE 4
    END,
    e.starts_at ASC NULLS LAST,
    t.sort_order ASC,
    t.name ASC
  LIMIT GREATEST(1, LEAST(coalesce(_limit, 6), 20));
$$;

GRANT EXECUTE ON FUNCTION public.list_home_experiences(integer) TO anon, authenticated;
