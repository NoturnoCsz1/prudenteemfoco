
-- =========================================================
-- Phase 3: Event Operations base (sectors, space types, spaces)
-- =========================================================

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.sector_status AS ENUM ('active','inactive','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.space_type_status AS ENUM ('active','inactive','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.space_operational_status AS ENUM ('available','blocked','maintenance','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Composite unique on events for composite FKs (integrity across org/event/sector/type/space)
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_id_organization_uk;
ALTER TABLE public.events
  ADD CONSTRAINT events_id_organization_uk UNIQUE (id, organization_id);

-- =========================================================
-- 3) event_sectors
-- =========================================================
CREATE TABLE IF NOT EXISTS public.event_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 1 AND 80),
  description text CHECK (description IS NULL OR char_length(description) <= 600),
  capacity int CHECK (capacity IS NULL OR capacity > 0),
  sort_order int NOT NULL DEFAULT 0,
  status public.sector_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_sectors_event_org_fk
    FOREIGN KEY (event_id, organization_id)
    REFERENCES public.events(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT event_sectors_slug_unique_per_event UNIQUE (event_id, slug),
  CONSTRAINT event_sectors_id_event_org_uk UNIQUE (id, event_id, organization_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_sectors TO authenticated;
GRANT ALL ON public.event_sectors TO service_role;
ALTER TABLE public.event_sectors ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_event_sectors_event ON public.event_sectors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sectors_org ON public.event_sectors(organization_id);

DROP TRIGGER IF EXISTS trg_event_sectors_updated_at ON public.event_sectors;
CREATE TRIGGER trg_event_sectors_updated_at
  BEFORE UPDATE ON public.event_sectors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Policies
DROP POLICY IF EXISTS "sectors_select_members" ON public.event_sectors;
CREATE POLICY "sectors_select_members" ON public.event_sectors
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "sectors_insert_manager" ON public.event_sectors;
CREATE POLICY "sectors_insert_manager" ON public.event_sectors
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

DROP POLICY IF EXISTS "sectors_update_manager" ON public.event_sectors;
CREATE POLICY "sectors_update_manager" ON public.event_sectors
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

DROP POLICY IF EXISTS "sectors_delete_admin" ON public.event_sectors;
CREATE POLICY "sectors_delete_admin" ON public.event_sectors
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

-- =========================================================
-- 4) reservable_space_types
-- =========================================================
CREATE TABLE IF NOT EXISTS public.reservable_space_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  sector_id uuid,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 600),
  capacity_per_unit int CHECK (capacity_per_unit IS NULL OR capacity_per_unit > 0),
  base_price numeric(12,2) CHECK (base_price IS NULL OR base_price >= 0),
  currency text NOT NULL DEFAULT 'BRL' CHECK (char_length(currency) = 3),
  status public.space_type_status NOT NULL DEFAULT 'active',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rst_event_org_fk
    FOREIGN KEY (event_id, organization_id)
    REFERENCES public.events(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT rst_sector_same_event_fk
    FOREIGN KEY (sector_id, event_id, organization_id)
    REFERENCES public.event_sectors(id, event_id, organization_id) ON DELETE SET NULL,
  CONSTRAINT rst_id_event_org_uk UNIQUE (id, event_id, organization_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservable_space_types TO authenticated;
GRANT ALL ON public.reservable_space_types TO service_role;
ALTER TABLE public.reservable_space_types ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rst_event ON public.reservable_space_types(event_id);
CREATE INDEX IF NOT EXISTS idx_rst_org ON public.reservable_space_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_rst_sector ON public.reservable_space_types(sector_id);

DROP TRIGGER IF EXISTS trg_rst_updated_at ON public.reservable_space_types;
CREATE TRIGGER trg_rst_updated_at
  BEFORE UPDATE ON public.reservable_space_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "rst_select_members" ON public.reservable_space_types;
CREATE POLICY "rst_select_members" ON public.reservable_space_types
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "rst_insert_manager" ON public.reservable_space_types;
CREATE POLICY "rst_insert_manager" ON public.reservable_space_types
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

DROP POLICY IF EXISTS "rst_update_manager" ON public.reservable_space_types;
CREATE POLICY "rst_update_manager" ON public.reservable_space_types
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

DROP POLICY IF EXISTS "rst_delete_admin" ON public.reservable_space_types;
CREATE POLICY "rst_delete_admin" ON public.reservable_space_types
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

-- =========================================================
-- 5) reservable_spaces
-- =========================================================
CREATE TABLE IF NOT EXISTS public.reservable_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  event_id uuid NOT NULL,
  space_type_id uuid NOT NULL,
  sector_id uuid,
  code text NOT NULL CHECK (char_length(code) BETWEEN 1 AND 60),
  display_name text CHECK (display_name IS NULL OR char_length(display_name) <= 120),
  capacity int CHECK (capacity IS NULL OR capacity > 0),
  operational_status public.space_operational_status NOT NULL DEFAULT 'available',
  sort_order int NOT NULL DEFAULT 0,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 600),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rs_type_same_event_fk
    FOREIGN KEY (space_type_id, event_id, organization_id)
    REFERENCES public.reservable_space_types(id, event_id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT rs_sector_same_event_fk
    FOREIGN KEY (sector_id, event_id, organization_id)
    REFERENCES public.event_sectors(id, event_id, organization_id) ON DELETE SET NULL,
  CONSTRAINT rs_code_unique_per_type UNIQUE (event_id, space_type_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservable_spaces TO authenticated;
GRANT ALL ON public.reservable_spaces TO service_role;
ALTER TABLE public.reservable_spaces ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rs_event ON public.reservable_spaces(event_id);
CREATE INDEX IF NOT EXISTS idx_rs_type ON public.reservable_spaces(space_type_id);
CREATE INDEX IF NOT EXISTS idx_rs_sector ON public.reservable_spaces(sector_id);
CREATE INDEX IF NOT EXISTS idx_rs_status ON public.reservable_spaces(operational_status);

DROP TRIGGER IF EXISTS trg_rs_updated_at ON public.reservable_spaces;
CREATE TRIGGER trg_rs_updated_at
  BEFORE UPDATE ON public.reservable_spaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "rs_select_members" ON public.reservable_spaces;
CREATE POLICY "rs_select_members" ON public.reservable_spaces
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "rs_insert_manager" ON public.reservable_spaces;
CREATE POLICY "rs_insert_manager" ON public.reservable_spaces
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

DROP POLICY IF EXISTS "rs_update_manager" ON public.reservable_spaces;
CREATE POLICY "rs_update_manager" ON public.reservable_spaces
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

DROP POLICY IF EXISTS "rs_delete_admin" ON public.reservable_spaces;
CREATE POLICY "rs_delete_admin" ON public.reservable_spaces
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

-- =========================================================
-- 6) Bulk generation RPC (idempotent, authorized, audited)
-- =========================================================
CREATE OR REPLACE FUNCTION public.generate_reservable_spaces(
  _space_type_id uuid,
  _quantity int,
  _prefix text,
  _pad int DEFAULT 2,
  _start_number int DEFAULT 1
)
RETURNS TABLE (created_count int, skipped_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _type public.reservable_space_types%ROWTYPE;
  _created int := 0;
  _attempted int := 0;
  _code text;
  _i int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF _quantity IS NULL OR _quantity < 1 OR _quantity > 500 THEN
    RAISE EXCEPTION 'quantity must be between 1 and 500';
  END IF;

  IF _pad IS NULL OR _pad < 1 OR _pad > 6 THEN
    RAISE EXCEPTION 'pad must be between 1 and 6';
  END IF;

  IF _start_number IS NULL OR _start_number < 0 THEN
    RAISE EXCEPTION 'start_number must be >= 0';
  END IF;

  IF _prefix IS NULL OR char_length(btrim(_prefix)) = 0 OR char_length(_prefix) > 40 THEN
    RAISE EXCEPTION 'prefix must be 1..40 chars';
  END IF;

  SELECT * INTO _type FROM public.reservable_space_types WHERE id = _space_type_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'space type not found';
  END IF;

  IF NOT public.has_org_role_at_least(_uid, _type.organization_id, 'manager'::public.member_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR _i IN 0.._quantity - 1 LOOP
    _code := btrim(_prefix) || ' ' || lpad((_start_number + _i)::text, _pad, '0');
    _attempted := _attempted + 1;
    INSERT INTO public.reservable_spaces (
      organization_id, event_id, space_type_id, sector_id, code, capacity
    )
    VALUES (
      _type.organization_id, _type.event_id, _type.id, _type.sector_id, _code, _type.capacity_per_unit
    )
    ON CONFLICT (event_id, space_type_id, code) DO NOTHING;
    IF FOUND THEN
      _created := _created + 1;
    END IF;
  END LOOP;

  PERFORM public.record_audit_event(
    _type.organization_id, _uid, 'space.bulk_created', 'reservable_space_type', _type.id,
    jsonb_build_object(
      'event_id', _type.event_id,
      'space_type_id', _type.id,
      'prefix', btrim(_prefix),
      'quantity_requested', _quantity,
      'created', _created,
      'skipped', _attempted - _created,
      'start_number', _start_number,
      'pad', _pad
    ),
    NULL, NULL
  );

  RETURN QUERY SELECT _created, _attempted - _created;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_reservable_spaces(uuid,int,text,int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_reservable_spaces(uuid,int,text,int,int) TO authenticated;
