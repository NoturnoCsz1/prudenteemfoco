-- Fase 8.1: limpar dados de evento seed (Expo Prudente 2026) e filhos.
-- Preserva schema, RPCs, RLS, migrations. Apenas linhas.
DELETE FROM public.access_decision_cache;
DELETE FROM public.access_sessions;
DELETE FROM public.access_attempts;
DELETE FROM public.access_tokens;
DELETE FROM public.event_access_rules;
DELETE FROM public.event_credentials;
DELETE FROM public.event_invites;
DELETE FROM public.space_reservation_requests;
DELETE FROM public.reservable_spaces;
DELETE FROM public.reservable_space_types;
DELETE FROM public.event_sectors;
DELETE FROM public.event_attractions;
DELETE FROM public.promotions;
DELETE FROM public.leads;
DELETE FROM public.promoters;
DELETE FROM public.events;