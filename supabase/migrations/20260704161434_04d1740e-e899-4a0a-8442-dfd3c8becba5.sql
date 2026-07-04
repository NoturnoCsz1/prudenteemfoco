
-- 1) Enum
DO $$ BEGIN
  CREATE TYPE public.space_reservation_status AS ENUM (
    'pending','negotiating','approved','rejected','cancelled','confirmed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Tabela
CREATE TABLE IF NOT EXISTS public.space_reservation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  space_type_id uuid NOT NULL REFERENCES public.reservable_space_types(id) ON DELETE RESTRICT,
  space_id uuid REFERENCES public.reservable_spaces(id) ON DELETE SET NULL,
  promoter_id uuid REFERENCES public.promoters(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  promotion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL,
  requester_name text NOT NULL,
  requester_contact text NOT NULL,
  party_size integer,
  message text,
  status public.space_reservation_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT space_reservation_requests_name_len CHECK (char_length(requester_name) BETWEEN 1 AND 120),
  CONSTRAINT space_reservation_requests_contact_len CHECK (char_length(requester_contact) BETWEEN 3 AND 200),
  CONSTRAINT space_reservation_requests_message_len CHECK (message IS NULL OR char_length(message) <= 1000),
  CONSTRAINT space_reservation_requests_notes_len CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 2000),
  CONSTRAINT space_reservation_requests_party_size_range CHECK (party_size IS NULL OR (party_size BETWEEN 1 AND 500))
);

CREATE INDEX IF NOT EXISTS space_reservation_requests_event_idx
  ON public.space_reservation_requests (event_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS space_reservation_requests_org_idx
  ON public.space_reservation_requests (organization_id);
CREATE INDEX IF NOT EXISTS space_reservation_requests_promoter_idx
  ON public.space_reservation_requests (promoter_id);
CREATE INDEX IF NOT EXISTS space_reservation_requests_lead_idx
  ON public.space_reservation_requests (lead_id);

-- 3) GRANTs — anon NÃO recebe SELECT; anon só pode chamar RPCs específicas
GRANT SELECT, UPDATE, DELETE ON public.space_reservation_requests TO authenticated;
GRANT ALL ON public.space_reservation_requests TO service_role;
-- Sem INSERT direto: a criação pública passa pela RPC SECURITY DEFINER.

-- 4) RLS deny-by-default
ALTER TABLE public.space_reservation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY space_reservation_requests_select_members
  ON public.space_reservation_requests
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY space_reservation_requests_update_managers
  ON public.space_reservation_requests
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE POLICY space_reservation_requests_delete_admins
  ON public.space_reservation_requests
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'admin'::public.member_role));

-- Sem policy de INSERT: qualquer tentativa direta (mesmo autenticada) é negada.

-- 5) Trigger de updated_at
DROP TRIGGER IF EXISTS trg_space_reservation_requests_updated_at
  ON public.space_reservation_requests;
CREATE TRIGGER trg_space_reservation_requests_updated_at
  BEFORE UPDATE ON public.space_reservation_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) RPC pública: cria solicitação com validações server-side
CREATE OR REPLACE FUNCTION public.create_public_space_reservation_request(
  _event_slug text,
  _space_type_id uuid,
  _requester_name text,
  _requester_contact text,
  _promoter_code text DEFAULT NULL,
  _party_size integer DEFAULT NULL,
  _message text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _event_id uuid;
  _org_id uuid;
  _type public.reservable_space_types%ROWTYPE;
  _promoter_id uuid;
  _lead_id uuid;
  _request_id uuid;
  _name text := btrim(coalesce(_requester_name, ''));
  _contact text := btrim(coalesce(_requester_contact, ''));
  _msg text := NULLIF(btrim(coalesce(_message, '')), '');
BEGIN
  IF char_length(_name) < 1 OR char_length(_name) > 120 THEN
    RAISE EXCEPTION 'invalid name';
  END IF;
  IF char_length(_contact) < 3 OR char_length(_contact) > 200 THEN
    RAISE EXCEPTION 'invalid contact';
  END IF;
  IF _msg IS NOT NULL AND char_length(_msg) > 1000 THEN
    RAISE EXCEPTION 'message too long';
  END IF;
  IF _party_size IS NOT NULL AND (_party_size < 1 OR _party_size > 500) THEN
    RAISE EXCEPTION 'invalid party_size';
  END IF;

  SELECT id, organization_id INTO _event_id, _org_id
  FROM public.events WHERE slug = _event_slug AND status = 'published' LIMIT 1;
  IF _event_id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  SELECT * INTO _type FROM public.reservable_space_types
    WHERE id = _space_type_id AND event_id = _event_id AND status = 'active' LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'space type not available';
  END IF;

  IF _promoter_code IS NOT NULL AND length(btrim(_promoter_code)) > 0 THEN
    SELECT id INTO _promoter_id FROM public.promoters
      WHERE event_id = _event_id
        AND lower(code) = lower(btrim(_promoter_code))
        AND active = true
      LIMIT 1;
  END IF;

  -- Cria lead vinculado
  INSERT INTO public.leads (
    organization_id, event_id, promoter_id, source, status,
    name, contact, metadata
  ) VALUES (
    _org_id, _event_id, _promoter_id,
    CASE WHEN _promoter_id IS NOT NULL THEN 'promoter'::public.lead_source
         ELSE 'direct'::public.lead_source END,
    'interested'::public.lead_status,
    _name, _contact,
    coalesce(_metadata, '{}'::jsonb)
      || jsonb_build_object(
        'origin', 'space_reservation_request',
        'space_type_id', _space_type_id
      )
  )
  RETURNING id INTO _lead_id;

  INSERT INTO public.space_reservation_requests (
    organization_id, event_id, space_type_id, promoter_id, lead_id,
    requester_name, requester_contact, party_size, message,
    status, metadata
  ) VALUES (
    _org_id, _event_id, _space_type_id, _promoter_id, _lead_id,
    _name, _contact, _party_size, _msg,
    'pending', coalesce(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO _request_id;

  PERFORM public.record_audit_event(
    _org_id, NULL, 'space_reservation.created',
    'space_reservation_request', _request_id,
    jsonb_build_object(
      'event_id', _event_id, 'space_type_id', _space_type_id,
      'promoter_id', _promoter_id, 'lead_id', _lead_id,
      'source', CASE WHEN _promoter_id IS NOT NULL THEN 'promoter' ELSE 'direct' END
    ), NULL, NULL
  );

  RETURN _request_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_public_space_reservation_request(
  text, uuid, text, text, text, integer, text, jsonb
) FROM public;
GRANT EXECUTE ON FUNCTION public.create_public_space_reservation_request(
  text, uuid, text, text, text, integer, text, jsonb
) TO anon, authenticated;

-- 7) RPC pública: listar tipos de espaço disponíveis por slug
CREATE OR REPLACE FUNCTION public.list_available_space_types_by_slug(_slug text)
RETURNS TABLE(
  space_type_id uuid,
  name text,
  category public.space_type_category,
  description text,
  capacity_per_unit integer,
  base_price numeric,
  currency text,
  image_url text,
  total_units integer,
  available_units integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT
    t.id,
    t.name,
    t.category,
    t.description,
    t.capacity_per_unit,
    t.base_price,
    t.currency,
    t.image_url,
    COALESCE(u.total, 0)::int,
    COALESCE(u.available, 0)::int
  FROM public.events e
  JOIN public.reservable_space_types t
    ON t.event_id = e.id AND t.status = 'active'
  LEFT JOIN LATERAL (
    SELECT
      count(*)::int AS total,
      count(*) FILTER (
        WHERE s.commercial_status = 'available'
          AND s.operational_status = 'available'
      )::int AS available
    FROM public.reservable_spaces s
    WHERE s.space_type_id = t.id
  ) u ON true
  WHERE e.slug = _slug AND e.status = 'published'
  ORDER BY
    CASE t.category
      WHEN 'camarote' THEN 1
      WHEN 'bistro' THEN 2
      WHEN 'mesa' THEN 3
      ELSE 4
    END,
    t.sort_order,
    t.name;
$fn$;

REVOKE ALL ON FUNCTION public.list_available_space_types_by_slug(text) FROM public;
GRANT EXECUTE ON FUNCTION public.list_available_space_types_by_slug(text) TO anon, authenticated;

-- 8) RPC admin: transicionar status do pedido (manager+)
CREATE OR REPLACE FUNCTION public.set_space_reservation_status(
  _request_id uuid,
  _new_status public.space_reservation_status,
  _space_id uuid DEFAULT NULL,
  _admin_notes text DEFAULT NULL
) RETURNS public.space_reservation_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _uid uuid := auth.uid();
  _row public.space_reservation_requests%ROWTYPE;
  _old public.space_reservation_status;
  _space public.reservable_spaces%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  SELECT * INTO _row FROM public.space_reservation_requests
    WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;

  IF NOT public.has_org_role_at_least(_uid, _row.organization_id, 'manager'::public.member_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _space_id IS NOT NULL THEN
    SELECT * INTO _space FROM public.reservable_spaces WHERE id = _space_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'space not found'; END IF;
    IF _space.event_id <> _row.event_id OR _space.space_type_id <> _row.space_type_id THEN
      RAISE EXCEPTION 'space does not match request';
    END IF;
  END IF;

  _old := _row.status;

  UPDATE public.space_reservation_requests
    SET status = _new_status,
        space_id = COALESCE(_space_id, space_id),
        admin_notes = COALESCE(_admin_notes, admin_notes),
        decided_at = now(),
        decided_by = _uid
    WHERE id = _request_id
    RETURNING * INTO _row;

  PERFORM public.record_audit_event(
    _row.organization_id, _uid, 'space_reservation.status_changed',
    'space_reservation_request', _request_id,
    jsonb_build_object(
      'from', _old, 'to', _new_status,
      'space_id', _row.space_id,
      'event_id', _row.event_id
    ), NULL, NULL
  );

  RETURN _row;
END;
$fn$;

REVOKE ALL ON FUNCTION public.set_space_reservation_status(uuid, public.space_reservation_status, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_space_reservation_status(uuid, public.space_reservation_status, uuid, text) TO authenticated;
