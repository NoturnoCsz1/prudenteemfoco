
-- ============================================================
-- FASE 8.3 — HOTSITE BUILDER
-- ============================================================

-- Enums
CREATE TYPE public.event_sponsor_category AS ENUM (
  'master','sponsor','supporter','partner','realization','production','media'
);
CREATE TYPE public.event_banner_placement AS ENUM (
  'below_hero','between_lineup_tickets','before_experiences','before_footer'
);
CREATE TYPE public.event_news_status AS ENUM ('draft','published');
CREATE TYPE public.event_commercial_link_type AS ENUM (
  'ticket','passport','sector','external_space','other'
);
CREATE TYPE public.hotsite_click_kind AS ENUM (
  'page_view','cta_primary','cta_secondary','commercial_link','reservation_intent','other'
);

-- ============================================================
-- event_hotsite_settings (1:1)
-- ============================================================
CREATE TABLE public.event_hotsite_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  hero_title text,
  hero_subtitle text,
  cta_primary_label text,
  cta_primary_url text,
  cta_secondary_label text,
  cta_secondary_url text,
  show_countdown boolean NOT NULL DEFAULT true,
  show_lineup boolean NOT NULL DEFAULT true,
  show_tickets boolean NOT NULL DEFAULT true,
  show_experiences boolean NOT NULL DEFAULT true,
  show_sponsors boolean NOT NULL DEFAULT true,
  show_news boolean NOT NULL DEFAULT true,
  show_info boolean NOT NULL DEFAULT true,
  show_banners boolean NOT NULL DEFAULT true,
  info_address text,
  info_gates_open_at text,
  info_age_rating text,
  info_parking text,
  info_map_url text,
  info_rules text,
  info_faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_hotsite_settings TO authenticated;
GRANT ALL ON public.event_hotsite_settings TO service_role;
ALTER TABLE public.event_hotsite_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members select hotsite" ON public.event_hotsite_settings
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));
CREATE POLICY "manager insert hotsite" ON public.event_hotsite_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "manager update hotsite" ON public.event_hotsite_settings
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "admin delete hotsite" ON public.event_hotsite_settings
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

CREATE TRIGGER trg_hotsite_settings_updated
  BEFORE UPDATE ON public.event_hotsite_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- event_sponsors
-- ============================================================
CREATE TABLE public.event_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  category public.event_sponsor_category NOT NULL DEFAULT 'sponsor',
  logo_url text,
  website_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_sponsors_event ON public.event_sponsors(event_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_sponsors TO authenticated;
GRANT ALL ON public.event_sponsors TO service_role;
ALTER TABLE public.event_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members select sponsors" ON public.event_sponsors
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));
CREATE POLICY "manager insert sponsors" ON public.event_sponsors
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "manager update sponsors" ON public.event_sponsors
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "admin delete sponsors" ON public.event_sponsors
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

CREATE TRIGGER trg_event_sponsors_updated
  BEFORE UPDATE ON public.event_sponsors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- event_banners
-- ============================================================
CREATE TABLE public.event_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text,
  image_url text NOT NULL,
  link_url text,
  placement public.event_banner_placement NOT NULL DEFAULT 'below_hero',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_banners_event ON public.event_banners(event_id, placement, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_banners TO authenticated;
GRANT ALL ON public.event_banners TO service_role;
ALTER TABLE public.event_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members select banners" ON public.event_banners
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));
CREATE POLICY "manager insert banners" ON public.event_banners
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "manager update banners" ON public.event_banners
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "admin delete banners" ON public.event_banners
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

CREATE TRIGGER trg_event_banners_updated
  BEFORE UPDATE ON public.event_banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- event_news
-- ============================================================
CREATE TABLE public.event_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  content text,
  image_url text,
  status public.event_news_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, slug)
);
CREATE INDEX idx_event_news_event ON public.event_news(event_id, status, published_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_news TO authenticated;
GRANT ALL ON public.event_news TO service_role;
ALTER TABLE public.event_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members select news" ON public.event_news
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));
CREATE POLICY "manager insert news" ON public.event_news
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "manager update news" ON public.event_news
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "admin delete news" ON public.event_news
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

CREATE TRIGGER trg_event_news_updated
  BEFORE UPDATE ON public.event_news
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- event_commercial_links
-- ============================================================
CREATE TABLE public.event_commercial_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label text NOT NULL,
  event_date date,
  link_type public.event_commercial_link_type NOT NULL DEFAULT 'ticket',
  destination_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  tracking_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_commercial_links_event ON public.event_commercial_links(event_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_commercial_links TO authenticated;
GRANT ALL ON public.event_commercial_links TO service_role;
ALTER TABLE public.event_commercial_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members select commercial links" ON public.event_commercial_links
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));
CREATE POLICY "manager insert commercial links" ON public.event_commercial_links
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "manager update commercial links" ON public.event_commercial_links
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "admin delete commercial links" ON public.event_commercial_links
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

CREATE TRIGGER trg_event_commercial_links_updated
  BEFORE UPDATE ON public.event_commercial_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- hotsite_click_events (tracking)
-- Sem PII — apenas kind + origem/UTM + referências opcionais
-- ============================================================
CREATE TABLE public.hotsite_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind public.hotsite_click_kind NOT NULL,
  commercial_link_id uuid REFERENCES public.event_commercial_links(id) ON DELETE SET NULL,
  promoter_id uuid REFERENCES public.promoters(id) ON DELETE SET NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hotsite_click_events_event ON public.hotsite_click_events(event_id, kind, created_at DESC);

GRANT SELECT ON public.hotsite_click_events TO authenticated;
GRANT ALL ON public.hotsite_click_events TO service_role;
ALTER TABLE public.hotsite_click_events ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy INSERT direta: escrita apenas via RPC SECURITY DEFINER
CREATE POLICY "members select clicks" ON public.hotsite_click_events
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

-- ============================================================
-- RPCs públicas
-- ============================================================

-- Settings do hotsite (retorna 1 linha)
CREATE OR REPLACE FUNCTION public.get_event_hotsite_by_slug(_slug text)
RETURNS TABLE (
  event_id uuid,
  hero_title text,
  hero_subtitle text,
  cta_primary_label text,
  cta_primary_url text,
  cta_secondary_label text,
  cta_secondary_url text,
  show_countdown boolean,
  show_lineup boolean,
  show_tickets boolean,
  show_experiences boolean,
  show_sponsors boolean,
  show_news boolean,
  show_info boolean,
  show_banners boolean,
  info_address text,
  info_gates_open_at text,
  info_age_rating text,
  info_parking text,
  info_map_url text,
  info_rules text,
  info_faq jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT h.event_id,
         h.hero_title, h.hero_subtitle,
         h.cta_primary_label, h.cta_primary_url,
         h.cta_secondary_label, h.cta_secondary_url,
         h.show_countdown, h.show_lineup, h.show_tickets,
         h.show_experiences, h.show_sponsors, h.show_news,
         h.show_info, h.show_banners,
         h.info_address, h.info_gates_open_at, h.info_age_rating,
         h.info_parking, h.info_map_url, h.info_rules, h.info_faq
  FROM public.events e
  JOIN public.event_hotsite_settings h ON h.event_id = e.id
  WHERE e.status = 'published' AND e.slug = _slug
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.list_event_sponsors_by_slug(_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  category public.event_sponsor_category,
  logo_url text,
  website_url text,
  sort_order integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.name, s.category, s.logo_url, s.website_url, s.sort_order
  FROM public.events e
  JOIN public.event_sponsors s ON s.event_id = e.id
  WHERE e.status = 'published' AND e.slug = _slug AND s.is_active = true
  ORDER BY s.category, s.sort_order, s.name;
$$;

CREATE OR REPLACE FUNCTION public.list_event_banners_by_slug(_slug text)
RETURNS TABLE (
  id uuid,
  title text,
  image_url text,
  link_url text,
  placement public.event_banner_placement,
  sort_order integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.title, b.image_url, b.link_url, b.placement, b.sort_order
  FROM public.events e
  JOIN public.event_banners b ON b.event_id = e.id
  WHERE e.status = 'published' AND e.slug = _slug AND b.is_active = true
  ORDER BY b.placement, b.sort_order;
$$;

CREATE OR REPLACE FUNCTION public.list_event_news_by_slug(_slug text, _limit integer DEFAULT 6)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  excerpt text,
  image_url text,
  published_at timestamptz,
  is_featured boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT n.id, n.title, n.slug, n.excerpt, n.image_url, n.published_at, n.is_featured
  FROM public.events e
  JOIN public.event_news n ON n.event_id = e.id
  WHERE e.status = 'published'
    AND e.slug = _slug
    AND n.status = 'published'
    AND (n.published_at IS NULL OR n.published_at <= now())
  ORDER BY n.is_featured DESC, n.published_at DESC NULLS LAST, n.sort_order
  LIMIT GREATEST(1, LEAST(coalesce(_limit, 6), 50));
$$;

CREATE OR REPLACE FUNCTION public.get_event_news_by_slugs(_event_slug text, _news_slug text)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  excerpt text,
  content text,
  image_url text,
  published_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT n.id, n.title, n.slug, n.excerpt, n.content, n.image_url, n.published_at
  FROM public.events e
  JOIN public.event_news n ON n.event_id = e.id
  WHERE e.status = 'published'
    AND e.slug = _event_slug
    AND n.slug = _news_slug
    AND n.status = 'published'
    AND (n.published_at IS NULL OR n.published_at <= now())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.list_event_commercial_links_by_slug(_slug text)
RETURNS TABLE (
  id uuid,
  label text,
  event_date date,
  link_type public.event_commercial_link_type,
  destination_url text,
  sort_order integer,
  tracking_enabled boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.id, l.label, l.event_date, l.link_type, l.destination_url, l.sort_order, l.tracking_enabled
  FROM public.events e
  JOIN public.event_commercial_links l ON l.event_id = e.id
  WHERE e.status = 'published' AND e.slug = _slug AND l.is_active = true
  ORDER BY l.event_date NULLS LAST, l.sort_order, l.label;
$$;

-- Tracking público — sem PII, promoter resolvido server-side
CREATE OR REPLACE FUNCTION public.track_hotsite_event(
  _event_slug text,
  _kind public.hotsite_click_kind,
  _commercial_link_id uuid DEFAULT NULL,
  _promoter_code text DEFAULT NULL,
  _utm_source text DEFAULT NULL,
  _utm_medium text DEFAULT NULL,
  _utm_campaign text DEFAULT NULL,
  _utm_content text DEFAULT NULL,
  _utm_term text DEFAULT NULL,
  _referrer text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _event_id uuid;
  _org_id uuid;
  _promoter_id uuid;
  _link_ok boolean;
  _id uuid;
BEGIN
  SELECT id, organization_id INTO _event_id, _org_id
  FROM public.events WHERE slug = _event_slug AND status = 'published' LIMIT 1;
  IF _event_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Validar link comercial pertence ao evento
  IF _commercial_link_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.event_commercial_links
      WHERE id = _commercial_link_id AND event_id = _event_id AND is_active = true
    ) INTO _link_ok;
    IF NOT _link_ok THEN
      _commercial_link_id := NULL;
    END IF;
  END IF;

  -- Resolver promoter server-side
  IF _promoter_code IS NOT NULL AND length(btrim(_promoter_code)) > 0 THEN
    SELECT id INTO _promoter_id FROM public.promoters
      WHERE event_id = _event_id
        AND lower(code) = lower(btrim(_promoter_code))
        AND active = true
      LIMIT 1;
  END IF;

  INSERT INTO public.hotsite_click_events (
    organization_id, event_id, kind, commercial_link_id, promoter_id,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer
  ) VALUES (
    _org_id, _event_id, _kind, _commercial_link_id, _promoter_id,
    nullif(btrim(coalesce(_utm_source,'')), ''),
    nullif(btrim(coalesce(_utm_medium,'')), ''),
    nullif(btrim(coalesce(_utm_campaign,'')), ''),
    nullif(btrim(coalesce(_utm_content,'')), ''),
    nullif(btrim(coalesce(_utm_term,'')), ''),
    nullif(btrim(coalesce(_referrer,'')), '')
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_hotsite_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_event_sponsors_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_event_banners_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_event_news_by_slug(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_news_by_slugs(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_event_commercial_links_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_hotsite_event(text, public.hotsite_click_kind, uuid, text, text, text, text, text, text, text) TO anon, authenticated;
