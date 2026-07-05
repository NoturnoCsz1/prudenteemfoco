
-- 1) Permitir linhas "site-wide" (sem event_id/organization_id)
ALTER TABLE public.hotsite_click_events
  ALTER COLUMN event_id DROP NOT NULL,
  ALTER COLUMN organization_id DROP NOT NULL;

-- 2) Novos kinds (idempotente)
ALTER TYPE public.hotsite_click_kind ADD VALUE IF NOT EXISTS 'home_page_view';
ALTER TYPE public.hotsite_click_kind ADD VALUE IF NOT EXISTS 'eventos_list_view';

-- 3) Índice para consultas site-wide
CREATE INDEX IF NOT EXISTS idx_hotsite_click_events_kind_created
  ON public.hotsite_click_events (kind, created_at DESC);
