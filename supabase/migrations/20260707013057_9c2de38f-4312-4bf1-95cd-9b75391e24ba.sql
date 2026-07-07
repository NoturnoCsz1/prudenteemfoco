
CREATE TABLE public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  destination_url text NOT NULL,
  campaign text,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT short_links_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  CONSTRAINT short_links_destination_scheme CHECK (destination_url ~* '^https?://')
);

CREATE INDEX short_links_org_idx ON public.short_links(organization_id);
CREATE INDEX short_links_slug_active_idx ON public.short_links(slug) WHERE active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_links TO authenticated;
GRANT ALL ON public.short_links TO service_role;

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "short_links_select_members" ON public.short_links
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY "short_links_insert_members" ON public.short_links
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY "short_links_update_members" ON public.short_links
  FOR UPDATE TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY "short_links_delete_managers" ON public.short_links
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE OR REPLACE FUNCTION public.short_links_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER short_links_touch
BEFORE UPDATE ON public.short_links
FOR EACH ROW EXECUTE FUNCTION public.short_links_touch_updated_at();

CREATE TABLE public.short_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_link_id uuid NOT NULL REFERENCES public.short_links(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  referrer text,
  user_agent text,
  device text,
  browser text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text
);

CREATE INDEX short_link_clicks_link_time_idx ON public.short_link_clicks(short_link_id, clicked_at DESC);

GRANT SELECT ON public.short_link_clicks TO authenticated;
GRANT ALL ON public.short_link_clicks TO service_role;

ALTER TABLE public.short_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "short_link_clicks_select_members" ON public.short_link_clicks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.short_links l
    WHERE l.id = short_link_clicks.short_link_id
      AND public.is_active_org_member(auth.uid(), l.organization_id)
  ));
