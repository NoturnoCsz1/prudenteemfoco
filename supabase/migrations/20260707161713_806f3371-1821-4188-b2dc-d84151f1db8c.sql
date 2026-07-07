-- ============================================================
-- CORREÇÃO FASE 1 — Mapas & Reservas
-- 1) Unicidade de rótulo por TIPO (não mais global no mapa)
-- 2) Canal de venda por unidade
-- ============================================================

-- ---- 1) Unicidade por (venue_map_id, type, lower(label)) WHERE active ----

-- Segurança: se houver conflitos sob a NOVA regra, aborta a migration.
DO $$
DECLARE
  _dup int;
BEGIN
  SELECT count(*) INTO _dup FROM (
    SELECT venue_map_id, type, lower(label)
    FROM public.venue_units
    WHERE active = true
    GROUP BY venue_map_id, type, lower(label)
    HAVING count(*) > 1
  ) x;
  IF _dup > 0 THEN
    RAISE EXCEPTION 'Existem % grupos com (venue_map_id, type, lower(label)) duplicados. Resolva antes de aplicar.', _dup;
  END IF;
END $$;

DROP INDEX IF EXISTS public.uq_venue_units_map_label;

CREATE UNIQUE INDEX uq_venue_units_map_type_label
  ON public.venue_units(venue_map_id, type, lower(label))
  WHERE active = true;

-- ---- 2) Canal de venda ----

CREATE TYPE public.venue_unit_sale_mode AS ENUM ('disabled','external_link','pix_manual');

ALTER TABLE public.venue_units
  ADD COLUMN sale_mode public.venue_unit_sale_mode NOT NULL DEFAULT 'disabled',
  ADD COLUMN sale_url text,
  ADD COLUMN pix_key text,
  ADD COLUMN pix_instructions text;

-- Validação de esquema seguro para sale_url (bloqueia javascript:, data:, etc.)
ALTER TABLE public.venue_units
  ADD CONSTRAINT venue_units_sale_url_scheme
  CHECK (sale_url IS NULL OR sale_url ~* '^https?://');

-- Coerência sale_mode <-> campos obrigatórios
ALTER TABLE public.venue_units
  ADD CONSTRAINT venue_units_sale_mode_requires_fields
  CHECK (
    (sale_mode = 'external_link' AND sale_url IS NOT NULL)
    OR sale_mode <> 'external_link'
  );
