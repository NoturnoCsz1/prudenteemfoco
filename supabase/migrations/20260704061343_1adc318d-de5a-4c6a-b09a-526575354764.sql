
-- Enums
CREATE TYPE public.lead_source AS ENUM ('roxou','direct','instagram','promoter','other');
CREATE TYPE public.lead_status AS ENUM ('new','interested','converted','lost');

-- promoters
CREATE TABLE public.promoters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promoters TO authenticated;
GRANT ALL ON public.promoters TO service_role;

ALTER TABLE public.promoters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promoters_select_members" ON public.promoters
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY "promoters_insert_managers" ON public.promoters
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE POLICY "promoters_update_managers" ON public.promoters
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE POLICY "promoters_delete_managers" ON public.promoters
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE INDEX idx_promoters_event ON public.promoters(event_id);
CREATE INDEX idx_promoters_org ON public.promoters(organization_id);

CREATE TRIGGER trg_promoters_updated_at
  BEFORE UPDATE ON public.promoters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  promoter_id uuid REFERENCES public.promoters(id) ON DELETE SET NULL,
  source public.lead_source NOT NULL DEFAULT 'direct',
  status public.lead_status NOT NULL DEFAULT 'new',
  name text,
  contact text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select_members" ON public.leads
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY "leads_insert_members" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY "leads_update_managers" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE POLICY "leads_delete_managers" ON public.leads
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE INDEX idx_leads_event ON public.leads(event_id);
CREATE INDEX idx_leads_org ON public.leads(organization_id);
CREATE INDEX idx_leads_promoter ON public.leads(promoter_id);
CREATE INDEX idx_leads_status ON public.leads(event_id, status);
CREATE INDEX idx_leads_source ON public.leads(event_id, source);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
