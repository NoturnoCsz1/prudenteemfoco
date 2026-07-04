
-- Fase 8.5: CMS institucional
-- Convenções: RLS habilitada em todas as tabelas, sem SELECT anônimo direto.
-- Leitura pública SEMPRE via RPCs SECURITY DEFINER (evita risco de vazamento futuro).
-- Escrita: manager+ pela org; DELETE apenas admin+.
-- Storage: reutiliza bucket `event-covers` com prefixo `<org_id>/site/...`.

-- ============================================================
-- ENUM
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.site_page AS ENUM ('home','sobre','contato','experiencias','eventos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- site_home (singleton por org)
-- ============================================================
CREATE TABLE public.site_home (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hero_eyebrow text,
  hero_title text,
  hero_subtitle text,
  cta_primary_label text,
  cta_primary_url text,
  cta_secondary_label text,
  cta_secondary_url text,
  experiences_headline text,
  experiences_body text,
  final_cta_headline text,
  final_cta_body text,
  final_cta_button_label text,
  final_cta_button_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_home TO authenticated;
GRANT ALL ON public.site_home TO service_role;
ALTER TABLE public.site_home ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_home manager select" ON public.site_home FOR SELECT TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_home manager write" ON public.site_home FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_home manager update" ON public.site_home FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_home admin delete" ON public.site_home FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));
CREATE TRIGGER site_home_set_updated_at BEFORE UPDATE ON public.site_home
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- site_about (singleton por org)
-- ============================================================
CREATE TABLE public.site_about (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text,
  subtitle text,
  origin_body text,
  today_body text,
  memory_body text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_about TO authenticated;
GRANT ALL ON public.site_about TO service_role;
ALTER TABLE public.site_about ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_about manager select" ON public.site_about FOR SELECT TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_about manager insert" ON public.site_about FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_about manager update" ON public.site_about FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_about admin delete" ON public.site_about FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));
CREATE TRIGGER site_about_set_updated_at BEFORE UPDATE ON public.site_about
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- site_contact (singleton por org)
-- ============================================================
CREATE TABLE public.site_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text,
  whatsapp text,
  service_message text,
  instagram_url text,
  institutional_message text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_contact TO authenticated;
GRANT ALL ON public.site_contact TO service_role;
ALTER TABLE public.site_contact ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_contact manager select" ON public.site_contact FOR SELECT TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_contact manager insert" ON public.site_contact FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_contact manager update" ON public.site_contact FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_contact admin delete" ON public.site_contact FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));
CREATE TRIGGER site_contact_set_updated_at BEFORE UPDATE ON public.site_contact
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- site_menu (singleton por org)
-- ============================================================
CREATE TABLE public.site_menu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  show_eventos boolean NOT NULL DEFAULT true,
  show_experiencias boolean NOT NULL DEFAULT true,
  show_sobre boolean NOT NULL DEFAULT true,
  show_contato boolean NOT NULL DEFAULT true,
  show_ver_agenda boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_menu TO authenticated;
GRANT ALL ON public.site_menu TO service_role;
ALTER TABLE public.site_menu ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_menu manager select" ON public.site_menu FOR SELECT TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_menu manager insert" ON public.site_menu FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_menu manager update" ON public.site_menu FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE TRIGGER site_menu_set_updated_at BEFORE UPDATE ON public.site_menu
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- site_memory_items (multi-linha)
-- ============================================================
CREATE TABLE public.site_memory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  year_label text,
  description text,
  image_url text,
  related_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX site_memory_items_org_sort_idx ON public.site_memory_items(organization_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_memory_items TO authenticated;
GRANT ALL ON public.site_memory_items TO service_role;
ALTER TABLE public.site_memory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_memory manager select" ON public.site_memory_items FOR SELECT TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_memory manager insert" ON public.site_memory_items FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_memory manager update" ON public.site_memory_items FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_memory admin delete" ON public.site_memory_items FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));
CREATE TRIGGER site_memory_items_set_updated_at BEFORE UPDATE ON public.site_memory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- site_seo (uma linha por página)
-- ============================================================
CREATE TABLE public.site_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_key public.site_page NOT NULL,
  title text,
  description text,
  og_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, page_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_seo TO authenticated;
GRANT ALL ON public.site_seo TO service_role;
ALTER TABLE public.site_seo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_seo manager select" ON public.site_seo FOR SELECT TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_seo manager insert" ON public.site_seo FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_seo manager update" ON public.site_seo FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "site_seo admin delete" ON public.site_seo FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));
CREATE TRIGGER site_seo_set_updated_at BEFORE UPDATE ON public.site_seo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Helper: org "principal" do site institucional (mais antiga).
-- ============================================================
CREATE OR REPLACE FUNCTION public.primary_site_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.primary_site_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.primary_site_org_id() TO anon, authenticated;

-- ============================================================
-- RPCs públicas (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_site_home()
RETURNS TABLE(
  hero_eyebrow text, hero_title text, hero_subtitle text,
  cta_primary_label text, cta_primary_url text,
  cta_secondary_label text, cta_secondary_url text,
  experiences_headline text, experiences_body text,
  final_cta_headline text, final_cta_body text,
  final_cta_button_label text, final_cta_button_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.hero_eyebrow, h.hero_title, h.hero_subtitle,
         h.cta_primary_label, h.cta_primary_url,
         h.cta_secondary_label, h.cta_secondary_url,
         h.experiences_headline, h.experiences_body,
         h.final_cta_headline, h.final_cta_body,
         h.final_cta_button_label, h.final_cta_button_url
  FROM public.site_home h
  WHERE h.is_active = true AND h.organization_id = public.primary_site_org_id()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_site_home() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_home() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_site_about()
RETURNS TABLE(
  title text, subtitle text, origin_body text, today_body text, memory_body text, image_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.title, a.subtitle, a.origin_body, a.today_body, a.memory_body, a.image_url
  FROM public.site_about a
  WHERE a.is_active = true AND a.organization_id = public.primary_site_org_id()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_site_about() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_about() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_site_contact()
RETURNS TABLE(
  email text, whatsapp text, service_message text, instagram_url text, institutional_message text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.email, c.whatsapp, c.service_message, c.instagram_url, c.institutional_message
  FROM public.site_contact c
  WHERE c.is_active = true AND c.organization_id = public.primary_site_org_id()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_site_contact() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_contact() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_site_menu()
RETURNS TABLE(
  show_eventos boolean, show_experiencias boolean, show_sobre boolean,
  show_contato boolean, show_ver_agenda boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.show_eventos, m.show_experiencias, m.show_sobre, m.show_contato, m.show_ver_agenda
  FROM public.site_menu m
  WHERE m.organization_id = public.primary_site_org_id()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_site_menu() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_menu() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_site_memory_items()
RETURNS TABLE(
  id uuid, title text, year_label text, description text, image_url text,
  related_event_slug text, sort_order integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.title, m.year_label, m.description, m.image_url,
         CASE WHEN e.status = 'published' THEN e.slug ELSE NULL END,
         m.sort_order
  FROM public.site_memory_items m
  LEFT JOIN public.events e ON e.id = m.related_event_id
  WHERE m.is_active = true AND m.organization_id = public.primary_site_org_id()
  ORDER BY m.sort_order ASC, m.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.list_site_memory_items() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_site_memory_items() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_site_seo(_page_key public.site_page)
RETURNS TABLE(title text, description text, og_image_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.title, s.description, s.og_image_url
  FROM public.site_seo s
  WHERE s.page_key = _page_key AND s.organization_id = public.primary_site_org_id()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_site_seo(public.site_page) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_site_seo(public.site_page) TO anon, authenticated;
