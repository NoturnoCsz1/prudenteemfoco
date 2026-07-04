
-- Enums
CREATE TYPE public.invite_type AS ENUM ('guest','influencer','sponsor','press','partner','artist','production');
CREATE TYPE public.invite_status AS ENUM ('active','revoked','used','expired');
CREATE TYPE public.credential_role_type AS ENUM ('staff','security','production','artist','supplier','press');
CREATE TYPE public.credential_status AS ENUM ('active','inactive');
CREATE TYPE public.access_rule_target AS ENUM ('invite','credential','sector','space');
CREATE TYPE public.access_rule_type AS ENUM ('allow','deny');

-- event_invites
CREATE TABLE public.event_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  type public.invite_type NOT NULL DEFAULT 'guest',
  name text NOT NULL,
  email text,
  phone text,
  status public.invite_status NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_invites_event_org_fk FOREIGN KEY (event_id, organization_id)
    REFERENCES public.events(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT event_invites_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 160)
);
CREATE INDEX event_invites_event_idx ON public.event_invites(event_id);
CREATE INDEX event_invites_org_idx ON public.event_invites(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_invites TO authenticated;
GRANT ALL ON public.event_invites TO service_role;
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_read_members" ON public.event_invites
FOR SELECT TO authenticated
USING (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY "invites_insert_managers" ON public.event_invites
FOR INSERT TO authenticated
WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE POLICY "invites_update_managers" ON public.event_invites
FOR UPDATE TO authenticated
USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE POLICY "invites_delete_admins" ON public.event_invites
FOR DELETE TO authenticated
USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

CREATE TRIGGER trg_event_invites_updated
BEFORE UPDATE ON public.event_invites
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- event_credentials
CREATE TABLE public.event_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  role_type public.credential_role_type NOT NULL DEFAULT 'staff',
  holder_name text NOT NULL,
  document_id text,
  access_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.credential_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_credentials_event_org_fk FOREIGN KEY (event_id, organization_id)
    REFERENCES public.events(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT event_credentials_holder_len CHECK (char_length(btrim(holder_name)) BETWEEN 1 AND 160)
);
CREATE INDEX event_credentials_event_idx ON public.event_credentials(event_id);
CREATE INDEX event_credentials_org_idx ON public.event_credentials(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_credentials TO authenticated;
GRANT ALL ON public.event_credentials TO service_role;
ALTER TABLE public.event_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credentials_read_members" ON public.event_credentials
FOR SELECT TO authenticated
USING (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY "credentials_insert_managers" ON public.event_credentials
FOR INSERT TO authenticated
WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE POLICY "credentials_update_managers" ON public.event_credentials
FOR UPDATE TO authenticated
USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE POLICY "credentials_delete_admins" ON public.event_credentials
FOR DELETE TO authenticated
USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

CREATE TRIGGER trg_event_credentials_updated
BEFORE UPDATE ON public.event_credentials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- event_access_rules (structural only)
CREATE TABLE public.event_access_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  target public.access_rule_target NOT NULL,
  rule_type public.access_rule_type NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_access_rules_event_org_fk FOREIGN KEY (event_id, organization_id)
    REFERENCES public.events(id, organization_id) ON DELETE CASCADE
);
CREATE INDEX event_access_rules_event_idx ON public.event_access_rules(event_id);
CREATE INDEX event_access_rules_org_idx ON public.event_access_rules(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_access_rules TO authenticated;
GRANT ALL ON public.event_access_rules TO service_role;
ALTER TABLE public.event_access_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rules_read_members" ON public.event_access_rules
FOR SELECT TO authenticated
USING (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY "rules_insert_managers" ON public.event_access_rules
FOR INSERT TO authenticated
WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE POLICY "rules_update_managers" ON public.event_access_rules
FOR UPDATE TO authenticated
USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE POLICY "rules_delete_admins" ON public.event_access_rules
FOR DELETE TO authenticated
USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

CREATE TRIGGER trg_event_access_rules_updated
BEFORE UPDATE ON public.event_access_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
