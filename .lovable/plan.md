# Fase 8.4 — Refatoração editorial da Home

Reutiliza toda a arquitetura já entregue (event_hotsite_settings, event_news, event_commercial_links, hotsite_click_events, promoters, reservable_space_types) e evolui a Home sem substituir a identidade atual do Hero.

## 1. Migration (única, mínima)

- `events`: adicionar `is_featured boolean NOT NULL DEFAULT false` e `featured_order integer NULL`. Index parcial para `status='published' AND is_featured=true`.
- Enum `hotsite_click_kind`: `ALTER TYPE ADD VALUE IF NOT EXISTS` para os novos kinds da Home (`home_hero_view`, `home_hero_click`, `home_event_card_click`, `home_news_click`, `home_experience_click`, `home_agenda_click`, `home_ticket_click`). Sem tabela nova.
- Recriar `list_published_events` e `get_published_event_by_slug` incluindo `is_featured` e `featured_order` (SECURITY DEFINER, mesmo shape das RPCs atuais).
- Nova RPC `list_home_featured_events()` — devolve eventos `status='published' AND is_featured=true` ordenados por `featured_order NULLS LAST, starts_at`. Fallback: próximo evento publicado futuro quando vazio.
- Nova RPC `list_home_news(_limit int)` — cross-event: apenas notícias publicadas com evento pai publicado; ordena `is_featured DESC, published_at DESC`; devolve também `event_slug` e `event_title` para composição editorial.
- Nova RPC `list_home_experiences(_limit int)` — cross-event: reservable_space_types ativos de eventos publicados futuros com pelo menos uma `reservable_spaces` disponível (usa a mesma lógica de `list_available_space_types_by_slug` agregada). Devolve `event_slug`, `event_title`, `name`, `category`, `image_url`, `base_price`, `available_units`.
- `track_hotsite_event` — mantida a assinatura atual. Todos os kinds `home_*` continuam exigindo `_event_slug`, resolvendo `event_id`/`organization_id`/`promoter_id` server-side. Sem `home_agenda_click` sem evento (esse CTA é navegação interna e não é rastreado).

## 2. Admin — destaque na Home

- `EventForm.tsx`: dois campos novos no bloco de publicação — toggle "Destaque na Home" e input "Ordem do destaque" (number, opcional, mostra apenas quando o toggle está ativo).
- `events.ts`/`events.functions.ts`: incluir `is_featured` / `featured_order` no upsert admin.
- Sem tabela `homepage_slides`.

## 3. Home (`src/routes/_site.index.tsx`) — refatoração editorial

### Loaders

Um único loader que dispara em paralelo (via `ensureQueryData`):

- `list_home_featured_events` — hero carousel + fallback
- `list_published_events` — próximos eventos + memória
- `list_home_news` — bloco de notícias
- `list_home_experiences` — bloco de experiências

### Hero Carousel (evolução do PosterHero atual)

- Preserva tipografia, overlay, composição, `poster`, `date-block`, `container-page`, `min-h` atual.
- Slides = eventos featured (fallback: próximo publicado).
- Mobile: `overflow-x-auto` + `scroll-snap-x mandatory`; swipe nativo.
- Desktop: setas prev/next + indicadores discretos (barra fina, não "dots" genéricos).
- Autoplay 7s com `IntersectionObserver` e `visibilitychange`; pausa após qualquer interação (`user-tap`/`focus`/`hover`); respeita `prefers-reduced-motion`.
- Preload apenas do slide 0 (`fetchPriority="high"`); demais `loading="lazy"`.
- CTAs: **primário** = `Ver evento` (interno `/eventos/:slug` — sempre); **secundário** = melhor `event_commercial_links` ativo para o evento (prioriza `link_type='passport'` em eventos multi-day, senão `ticket`, senão `external_ticket_url` legado, senão oculta o secundário).
- Datas multi-day: renderiza faixa `10–14 SET · 2026` via `formatEventDateEditorial` (já existente).
- Tracking: `home_hero_view` on slide-in (debounce 1s), `home_hero_click` no CTA primário, `home_ticket_click` no CTA secundário (com `commercial_link_id` quando existir).

### Próximos eventos

- Lista de próximos eventos publicados **excluindo** slugs do Hero (deduplicação editorial).
- Se resultado < 3, complementa com featured para não deixar vazio.
- Cards no mesmo padrão do `FestivalPoster`/`AgendaRow` atuais, sem virar card carousel genérico.
- Cada card → `/eventos/:slug` + tracking `home_event_card_click`.

### Descoberta por categoria

- Chips estáticos (`festival`, `show`, `special_event`, `other`) que filtram in-page a lista de próximos (client-side, sem nova rota). Preserva identidade editorial.

### Notícias

- `list_home_news` limit 6. Grid 3 col desktop / 1 col mobile.
- Link → `/eventos/:eventSlug/noticias/:newsSlug` + tracking `home_news_click`.
- Notícias podem repetir eventos do Hero (regra do briefing).

### Experiências

- `list_home_experiences` limit 4.
- Se vazio → seção não renderiza.
- Link → `/eventos/:eventSlug#experiencias` (preserva UTMs + promoter) + tracking `home_experience_click`.

### Memória

- Mantida — reutiliza `MemoryRow`.

## 4. Preservação de atribuição (promoter + UTMs)

- Novo helper `src/lib/attribution.ts` client-only: lê `?promoter=`, `?utm_*` da URL, persiste em `sessionStorage`, e expõe `withAttribution(to, params)` para gerar `to` com search preservado.
- Todos os `<Link>` da Home usam `withAttribution` para carregar promoter+UTMs no destino interno.
- Tracking client-side chama a RPC `track_hotsite_event` com os UTMs+promoter atuais.

## 5. Densidade visual

- Section wrapper atual usa `py-14 md:py-32` — reduzir para `py-12 md:py-24` (compact `py-10 md:py-20`).
- Hero: manter `min-h-[82svh] md:min-h-[100vh]` **apenas no slide 0**; slides subsequentes usam `min-h-[70svh]`.
- Remover CTA final duplicado quando já existe seção de próximos eventos.
- Verificar Home em 360/390/430/desktop.

## 6. Validação

Cenários A–J (0 eventos, 1 featured, 3+ featured, multi-day com passport, links por data, fallback legado external_ticket_url, notícias featured/normais, experiências vazias/com promoter, navegação preservando UTMs).

`bunx tsgo --noEmit` + `bun run build` no fim.

## Arquivos alterados/criados

- **Migration nova** (única): `supabase/migrations/<ts>_home_featured_and_home_kinds.sql`
- `src/routes/_site.index.tsx` (refatoração completa)
- `src/lib/events.functions.ts` (novas RPCs + campos featured)
- `src/lib/events.ts` (types PublicEvent com is_featured, helpers)
- `src/lib/attribution.ts` (novo)
- `src/lib/home.functions.ts` (novo — home news / home experiences / home featured / tracking wrapper)
- `src/components/site/HeroCarousel.tsx` (novo)
- `src/components/admin/EventForm.tsx` (dois campos novos)
- `src/integrations/supabase/types.ts` (regenerado após migration)

## Riscos residuais reais

- `ALTER TYPE ADD VALUE` dentro de tx: PG12+ permite, mas os novos valores não podem ser usados na mesma migration — não são, apenas declarados.
- `list_home_experiences` faz agregação por evento e pode ficar lenta com muitos eventos publicados. Aceito para o volume atual; index existe em `reservable_spaces (space_type_id)`.
- `ensureQueryData` de 4 RPCs em paralelo aumenta ligeiramente TTFB; aceito porque tudo é SECURITY DEFINER com filtro por slug/status.
- Sem checkout/pagamento/QR/upload/galeria/analytics dashboard — fora de escopo por instrução.

Parar após a Fase 8.4 e apresentar relatório. Sem Fase 8.5 automática.

&nbsp;

Confirmado para prosseguir.

&nbsp;

Apenas ajuste um ponto antes de executar:

não use min-height diferente por slide no Hero Carousel se isso causar pulo visual durante autoplay/swipe. A altura do carrossel deve ser estável por viewport. Pode manter 82svh mobile e 100vh desktop para o container inteiro, mas os slides devem ocupar a mesma altura.

&nbsp;

Também garanta que, se houver apenas 1 evento no hero, o carousel não mostre setas, indicadores ou autoplay desnecessário.

&nbsp;

Pode executar a Fase 8.4 e parar no relatório final.