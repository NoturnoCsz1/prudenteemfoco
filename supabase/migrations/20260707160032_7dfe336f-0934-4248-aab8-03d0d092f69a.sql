
-- ============================================================
-- FASE 1 — MÓDULO MAPAS E RESERVAS
-- ============================================================

CREATE TYPE public.venue_map_type AS ENUM (
  'numbered_units','sector_map','mixed_map','informational_map'
);
CREATE TYPE public.venue_map_status AS ENUM ('draft','published','archived');
CREATE TYPE public.venue_map_analysis_status AS ENUM (
  'none','pending','running','complete','failed'
);
CREATE TYPE public.venue_unit_type AS ENUM (
  'bistro','table','box','sector','grandstand','lounge','vip','open_bar','pista','front','other'
);
CREATE TYPE public.venue_unit_status AS ENUM (
  'available','held','pending_payment','reserved','sold','blocked'
);

-- ============================================================
-- venue_maps
-- ============================================================
CREATE TABLE public.venue_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  image_url text,
  image_storage_path text,
  map_type public.venue_map_type NOT NULL DEFAULT 'numbered_units',
  status public.venue_map_status NOT NULL DEFAULT 'draft',
  analysis_status public.venue_map_analysis_status NOT NULL DEFAULT 'none',
  analysis_result jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_venue_maps_event ON public.venue_maps(event_id, sort_order);
CREATE INDEX idx_venue_maps_org ON public.venue_maps(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_maps TO authenticated;
GRANT ALL ON public.venue_maps TO service_role;
ALTER TABLE public.venue_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members select venue_maps" ON public.venue_maps
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));
CREATE POLICY "manager insert venue_maps" ON public.venue_maps
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "manager update venue_maps" ON public.venue_maps
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "admin delete venue_maps" ON public.venue_maps
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

CREATE TRIGGER trg_venue_maps_updated
  BEFORE UPDATE ON public.venue_maps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- venue_units
-- ============================================================
CREATE TABLE public.venue_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  venue_map_id uuid NOT NULL REFERENCES public.venue_maps(id) ON DELETE CASCADE,
  type public.venue_unit_type NOT NULL DEFAULT 'bistro',
  label text NOT NULL,
  number integer,
  sector text,
  capacity integer,
  price_cents integer,
  x_percent numeric(6,3),
  y_percent numeric(6,3),
  status public.venue_unit_status NOT NULL DEFAULT 'blocked',
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_units_x_range CHECK (x_percent IS NULL OR (x_percent >= 0 AND x_percent <= 100)),
  CONSTRAINT venue_units_y_range CHECK (y_percent IS NULL OR (y_percent >= 0 AND y_percent <= 100)),
  CONSTRAINT venue_units_capacity_pos CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT venue_units_price_nonneg CHECK (price_cents IS NULL OR price_cents >= 0)
);
CREATE INDEX idx_venue_units_map ON public.venue_units(venue_map_id);
CREATE INDEX idx_venue_units_event ON public.venue_units(event_id, active);
CREATE UNIQUE INDEX uq_venue_units_map_label
  ON public.venue_units(venue_map_id, lower(label))
  WHERE active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_units TO authenticated;
GRANT ALL ON public.venue_units TO service_role;
ALTER TABLE public.venue_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members select venue_units" ON public.venue_units
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));
CREATE POLICY "manager insert venue_units" ON public.venue_units
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "manager update venue_units" ON public.venue_units
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));
CREATE POLICY "manager delete venue_units" ON public.venue_units
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE TRIGGER trg_venue_units_updated
  BEFORE UPDATE ON public.venue_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Storage: bucket 'venue-maps'
-- Path convention: {organization_id}/{event_id}/{filename}
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_manage_venue_map(_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
BEGIN
  IF auth.uid() IS NULL OR _path IS NULL THEN
    RETURN false;
  END IF;
  BEGIN
    _org_id := split_part(_path, '/', 1)::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  RETURN public.has_org_role_at_least(auth.uid(), _org_id, 'manager'::public.member_role);
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_venue_map(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_venue_map(text) TO authenticated;

DROP POLICY IF EXISTS "venue_maps_select_auth" ON storage.objects;
CREATE POLICY "venue_maps_select_auth"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'venue-maps'
    AND public.can_manage_venue_map(name)
  );

DROP POLICY IF EXISTS "venue_maps_insert_manager" ON storage.objects;
CREATE POLICY "venue_maps_insert_manager"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'venue-maps'
    AND owner = auth.uid()
    AND public.can_manage_venue_map(name)
  );

DROP POLICY IF EXISTS "venue_maps_update_manager" ON storage.objects;
CREATE POLICY "venue_maps_update_manager"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'venue-maps' AND public.can_manage_venue_map(name))
  WITH CHECK (bucket_id = 'venue-maps' AND public.can_manage_venue_map(name));

DROP POLICY IF EXISTS "venue_maps_delete_manager" ON storage.objects;
CREATE POLICY "venue_maps_delete_manager"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'venue-maps' AND public.can_manage_venue_map(name));
