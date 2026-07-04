
-- Fase 2 — Módulo comercial de espaços (camarotes/bistrôs/mesas/outros)

-- 1) Enum de categoria comercial do tipo de espaço
DO $$ BEGIN
  CREATE TYPE public.space_type_category AS ENUM ('camarote','bistro','mesa','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Enum de status comercial da unidade
DO $$ BEGIN
  CREATE TYPE public.space_commercial_status AS ENUM (
    'available','negotiating','reserved','confirmed','unavailable'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Colunas em reservable_space_types
ALTER TABLE public.reservable_space_types
  ADD COLUMN IF NOT EXISTS category public.space_type_category NOT NULL DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.reservable_space_types
  DROP CONSTRAINT IF EXISTS reservable_space_types_image_url_len;
ALTER TABLE public.reservable_space_types
  ADD CONSTRAINT reservable_space_types_image_url_len
  CHECK (image_url IS NULL OR char_length(image_url) BETWEEN 1 AND 600);

-- 4) Coluna commercial_status em reservable_spaces
ALTER TABLE public.reservable_spaces
  ADD COLUMN IF NOT EXISTS commercial_status public.space_commercial_status
    NOT NULL DEFAULT 'available';

-- 5) Índices auxiliares
CREATE INDEX IF NOT EXISTS reservable_space_types_event_category_idx
  ON public.reservable_space_types (event_id, category);
CREATE INDEX IF NOT EXISTS reservable_spaces_type_commercial_idx
  ON public.reservable_spaces (space_type_id, commercial_status);

-- 6) RPC para alterar status comercial com auditoria (manager+)
CREATE OR REPLACE FUNCTION public.set_space_commercial_status(
  _space_id uuid,
  _new_status public.space_commercial_status
) RETURNS public.reservable_spaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _uid uuid := auth.uid();
  _row public.reservable_spaces%ROWTYPE;
  _old public.space_commercial_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  SELECT * INTO _row FROM public.reservable_spaces WHERE id = _space_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'space not found'; END IF;

  IF NOT public.has_org_role_at_least(_uid, _row.organization_id, 'manager'::public.member_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  _old := _row.commercial_status;
  IF _old = _new_status THEN
    RETURN _row;
  END IF;

  UPDATE public.reservable_spaces
    SET commercial_status = _new_status, updated_at = now()
    WHERE id = _space_id
    RETURNING * INTO _row;

  PERFORM public.record_audit_event(
    _row.organization_id, _uid, 'space.commercial_status_changed',
    'reservable_space', _space_id,
    jsonb_build_object('from', _old, 'to', _new_status,
                       'event_id', _row.event_id,
                       'space_type_id', _row.space_type_id),
    NULL, NULL
  );
  RETURN _row;
END;
$fn$;

REVOKE ALL ON FUNCTION public.set_space_commercial_status(uuid, public.space_commercial_status) FROM public;
GRANT EXECUTE ON FUNCTION public.set_space_commercial_status(uuid, public.space_commercial_status) TO authenticated;
