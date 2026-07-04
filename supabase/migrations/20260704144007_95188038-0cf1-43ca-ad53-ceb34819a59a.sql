
-- Enum tipo de promoção
DO $$ BEGIN
  CREATE TYPE public.promotion_type AS ENUM ('discount','vip_access','early_access');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela promotions
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  promoter_id uuid REFERENCES public.promoters(id) ON DELETE SET NULL,
  title text NOT NULL,
  type public.promotion_type NOT NULL,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_event ON public.promotions(event_id);
CREATE INDEX IF NOT EXISTS idx_promotions_promoter ON public.promotions(promoter_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotions_select_members" ON public.promotions
  FOR SELECT TO authenticated
  USING (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY "promotions_insert_manager" ON public.promotions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE POLICY "promotions_update_manager" ON public.promotions
  FOR UPDATE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role))
  WITH CHECK (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE POLICY "promotions_delete_manager" ON public.promotions
  FOR DELETE TO authenticated
  USING (public.has_org_role_at_least(auth.uid(), organization_id, 'manager'::public.member_role));

CREATE TRIGGER promotions_set_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RPC público (anon) para rastrear leads a partir da página pública
CREATE OR REPLACE FUNCTION public.track_public_lead(
  _event_slug text,
  _promoter_code text DEFAULT NULL,
  _source public.lead_source DEFAULT 'direct',
  _name text DEFAULT NULL,
  _contact text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _event_id uuid;
  _org_id uuid;
  _promoter_id uuid;
  _final_source public.lead_source := _source;
  _lead_id uuid;
BEGIN
  SELECT id, organization_id INTO _event_id, _org_id
  FROM public.events WHERE slug = _event_slug AND status = 'published' LIMIT 1;
  IF _event_id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  IF _promoter_code IS NOT NULL AND length(btrim(_promoter_code)) > 0 THEN
    SELECT id INTO _promoter_id FROM public.promoters
      WHERE event_id = _event_id AND lower(code) = lower(btrim(_promoter_code)) AND active = true
      LIMIT 1;
    IF _promoter_id IS NOT NULL THEN
      _final_source := 'promoter';
    END IF;
  END IF;

  INSERT INTO public.leads (
    organization_id, event_id, promoter_id, source, status, name, contact, metadata
  ) VALUES (
    _org_id, _event_id, _promoter_id, _final_source, 'new',
    _name, _contact,
    COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO _lead_id;

  RETURN _lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_public_lead(text, text, public.lead_source, text, text, jsonb) TO anon, authenticated;
