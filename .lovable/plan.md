# Fase 8.5 — CMS do Site Institucional

Pode prosseguir com a Fase 8.5.

&nbsp;

Ajustes obrigatórios antes da execução:

&nbsp;

1. Não criar `site-assets` se isso atrasar ou complicar a migration.

Preferência inicial:

- reutilizar o bucket `event-covers` com prefixo `<org_id>/site/...`

- ou criar `site-assets` somente se a policy ficar simples e segura.

&nbsp;

2. Cuidado com `anon SELECT` direto nas tabelas.

Preferência de segurança:

- leitura pública via RPCs;

- tabelas podem ter SELECT público apenas se não houver risco de vazamento.

Como são textos institucionais, ok, mas documentar bem.

&nbsp;

3. O menu público controlado por `site_menu` não pode quebrar a navegação.

Se RPC falhar ou não houver registro:

- manter todos os itens visíveis por fallback.

&nbsp;

4. Antes de criar muitos formulários, priorizar a primeira entrega funcional:

- migration;

- RPCs;

- menu admin “Site”;

- Home;

- Nossa História;

- Contato;

- Menu público;

- SEO básico.

&nbsp;

Memória/Eventos passados pode entrar na mesma fase se não comprometer build, mas não travar a entrega principal.

&nbsp;

5. Remover qualquer texto “Fase 0”, “módulo em fase própria” ou shell administrativo caso apareça novamente.

&nbsp;

&nbsp;

Objetivo: mover textos, imagens e SEO das páginas institucionais para o banco, com CRUD no admin e leitura pública via RPCs. Não mexe em eventos/hotsites/Access Engine.

## 1. Modelo de dados (migration única)

Todas as tabelas em `public`, com GRANTs (`authenticated`, `service_role`, `anon` só em SELECT), RLS habilitada e políticas via `has_org_role_at_least`. `service_role` sempre incluso.

Um único registro por organização por seção — usamos `organization_id` como chave lógica + `singleton_key = 'default'` com UNIQUE, para permitir upsert idempotente.

### `site_home` (singleton por org)

Colunas de domínio: `hero_eyebrow`, `hero_title`, `hero_subtitle`, `cta_primary_label`, `cta_primary_url`, `cta_secondary_label`, `cta_secondary_url`, `experiences_headline`, `experiences_body`, `final_cta_headline`, `final_cta_body`, `final_cta_button_label`, `final_cta_button_url`, `is_active` (bool default true).

### `site_about` (singleton por org — "Nossa História")

Colunas: `title`, `subtitle`, `origin_body`, `today_body`, `memory_body`, `image_url`, `is_active`.

### `site_contact` (singleton por org)

Colunas: `email`, `whatsapp`, `service_message`, `instagram_url`, `institutional_message`, `is_active`.

### `site_menu` (singleton por org)

Booleans por item: `show_eventos`, `show_experiencias`, `show_sobre`, `show_contato`, `show_ver_agenda`. Todos default true.

### `site_memory_items` (multi-linha)

`id`, `organization_id`, `title`, `year_label` (text, ex. "2024"), `description`, `image_url`, `related_event_id` (fk `events` nullable, `on delete set null`), `sort_order`, `is_active`. Índice `(organization_id, sort_order)`.

### `site_seo` (uma linha por página)

`id`, `organization_id`, `page_key` enum `site_page` (`home | sobre | contato | experiencias | eventos`), `title`, `description`, `og_image_url`. UNIQUE `(organization_id, page_key)`.

### Políticas

- Público (`anon`): SELECT permitido apenas onde `is_active = true` (singletons e memory) — nas tabelas SEO leitura sempre pública. `related_event_id` continua respeitando RLS de `events` (join via RPC, não select cruzado).
- `manager+`: SELECT/INSERT/UPDATE all rows da própria org.
- `admin+`: DELETE (apenas em `site_memory_items` e reset de singletons).

### RPCs `SECURITY DEFINER` (`STABLE`, retornam apenas o registro ativo da org "principal" — a org do site institucional):

- `get_site_home()`, `get_site_about()`, `get_site_contact()`, `get_site_menu()` — retornam TABLE com uma linha (LIMIT 1). Filtram `is_active = true`. Se não houver linha, retornam vazio (o front usa fallback estático).
- `list_site_memory_items()` — lista ativos ordenados.
- `get_site_seo(_page_key site_page)` — 1 linha.

Todas expostas a `anon` e `authenticated` via `GRANT EXECUTE`.

Como não há multi-tenant público hoje, resolvo "org principal" pela primeira `organizations` (LIMIT 1 ORDER BY created_at ASC). Documentado no comentário da função.

## 2. Server functions (`src/lib/site.functions.ts`)

Wrappers chamando as RPCs (via server publishable client — leitura pública, RLS anon). Tipos derivados de `Database`.

## 3. Admin (`_authenticated/admin.site.*`)

Rota-âncora `admin.site.tsx` com sub-nav (mobile: select; desktop: tabs) e `<Outlet />`. Filhos:

- `admin.site.index.tsx` → redirect para `home` (ou dashboard resumo simples)
- `admin.site.home.tsx` — form dos campos de `site_home`
- `admin.site.sobre.tsx` — form + upload de imagem (reutiliza `CoverUpload` existente com bucket dedicado `site-assets` que criamos na migration)
- `admin.site.contato.tsx` — form dos campos de `site_contact`
- `admin.site.menu.tsx` — 5 checkboxes de `site_menu`
- `admin.site.memoria.tsx` — lista + form inline (adicionar/editar/reordenar/excluir/toggle ativo), select opcional para `related_event_id` populado por `events` da org
- `admin.site.seo.tsx` — 5 blocos (home, sobre, contato, experiencias, eventos), cada um com title/description/og_image

Cada form usa React Hook Form + zod (padrão já existente em `EventForm`), `useMutation` chama upsert direto via `supabase` (RLS `manager+`), invalida query. Salvar → toast `Sonner`. Sem editor drag-and-drop, sem markdown avançado.

## 4. Páginas públicas — conectar aos dados

Ajustes mínimos, preservando design:

- `_site.index.tsx`: `InstitutionalHero` lê `site_home` (fallback aos textos atuais); `ExperiencesSection` headline/body de `site_home`; `FinalCTA` idem.
- `_site.sobre.tsx`: lê `site_about` — todos os blocos vêm do banco; renderiza `image_url` se presente. Sem registro → mantém texto atual (fallback estático).
- `_site.contato.tsx`: lê `site_contact` — email/whatsapp/instagram vira links reais (`mailto:`, `https://wa.me/<num>`, url).
- `_site.experiencias.tsx`: usa `site_seo` (home key `experiencias`) para `head()`. Corpo continua o atual (só experiencias transacionais existem — não plotamos texto CMS aqui).
- `_site.index.tsx` MemorySection: se `site_memory_items` tem itens ativos, renderiza-os no lugar do arquivo baseado em `events` passados; senão mantém fallback atual (eventos encerrados).
- `Header.tsx` / `Footer.tsx`: consomem `site_menu` para esconder itens quando `show_* = false`.

Todos os `head()` das rotas institucionais passam a ler `site_seo` via loader que preenche `queryClient` (fallback aos meta atuais).

## 5. Menus admin

`admin.tsx` NAV final:

- Visão Geral (`/admin`)
- Eventos (`/admin/eventos`)
- **Site** (`/admin/site`) — novo
- Equipe (`/admin/equipe`)

Já removi Experiências/Operação/Configurações na fase anterior (arquivos deletados). Confirmar que nada volta.

Sub-nav de Site: Home · Nossa História · Memória · Contato · Menu · SEO.

## 6. Storage

Novo bucket público `site-assets` para imagens de "Nossa História" e memória. Policy: SELECT público, INSERT/UPDATE/DELETE via `has_org_role_at_least(..., 'manager')` checando prefixo `<org_id>/…` (mesmo padrão já usado no bucket de covers).

## 7. Regras de fallback

- Se RPC retorna zero linhas → página usa strings hardcoded atuais como fallback (evita "página em branco").
- Textos hardcoded existentes ficam **apenas** como fallback dentro da própria página, para não quebrar antes do primeiro save.

## 8. Testes / entrega

- `bunx tsgo --noEmit`
- `bun run build`
- Teste manual Playwright 390×844: abrir `/admin/site/home`, salvar, recarregar `/` e confirmar que o hero mudou.

## 9. Fora do escopo

- Nenhuma alteração em Access Engine, hotsites de evento, eventos, reservas, promoters, leads.
- Sem editor rich-text; textos são `textarea` simples (linhas quebradas viram `<p>` via `whitespace-pre-line`).
- Sem multi-idioma.
- Sem versionamento/draft — `is_active` já cobre esconder do público.

## Riscos residuais

- Se houver mais de uma organização no futuro, `list_site_*` precisa aceitar `_org_id` ou slug. Hoje resolvo pela org mais antiga; documentado em SQL.
- Bucket `site-assets` precisa ser criado via migration (`storage.buckets` insert + policies). Se já existir com o mesmo id, o insert é idempotente.
- `related_event_id` com evento arquivado/rascunho: RPC pública filtra apenas `is_active`, não valida status do evento — o link no front só renderiza se o evento existe e está `published`.

Peço aprovação para executar. Começo pela migration (via `supabase--migration`) e, após aprovação dela, sigo com server fns, páginas admin e cablagem pública em uma segunda leva.