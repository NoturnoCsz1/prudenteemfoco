# Fase 2 — Núcleo Institucional de Eventos

Esta fase transforma "eventos" na primeira unidade real da plataforma.
Nenhum módulo futuro (reservas, VIP, QR, scanner, promoters, convites,
credenciais, pagamentos, CRM, analytics, IA, agentes, Access Engine) foi
implementado.

## 1. Modelo de dados

Tabela `public.events` (mantida da Fase 1):

| Campo               | Tipo          | Observação                                    |
| ------------------- | ------------- | --------------------------------------------- |
| `id`                | uuid          | PK                                            |
| `organization_id`   | uuid          | FK → `organizations`                          |
| `title`             | text          | obrigatório                                   |
| `slug`              | text          | único por organização, `[a-z0-9-]+`           |
| `status`            | `event_status`| `draft` / `scheduled` / `published` / `cancelled` / `archived` |
| `starts_at`         | timestamptz   | opcional                                      |
| `ends_at`           | timestamptz   | opcional, deve ser ≥ `starts_at`              |
| `venue_name`        | text          | opcional                                      |
| `city`              | text          | opcional                                      |
| `short_description` | text          | opcional, máx. 600 caracteres                 |
| `cover_image_url`   | text          | URL https:// (Storage fica para 2.1)          |

## 2. Fluxo de publicação

1. Um manager ou superior cria o evento em `draft`.
2. Preenche os dados; salva quantas vezes quiser (nada aparece publicamente).
3. Ao mudar `status` para `published`, o evento fica visível em `/eventos`
   e ganha uma página própria em `/eventos/{slug}`.
4. Voltar para `draft`, `scheduled`, `cancelled` ou `archived` remove
   imediatamente do público (policy filtra por `status = 'published'`).

## 3. Policies RLS

**Administrativas (Fase 1, inalteradas):**

- `events_select_members` — membros ativos veem todos os eventos da própria org.
- `events_insert_manager` — manager+ pode criar.
- `events_update_manager` — manager+ pode editar/mudar status.
- `events_delete_admin` — admin+ pode excluir.

**Público (Fase 2, novo):**

- `events_select_public_published` — `anon` e `authenticated` podem SELECT
  apenas quando `status = 'published'`. Único caminho de leitura pública.

`GRANT SELECT ON public.events TO anon` habilita o Data API para anon,
restrito pela policy acima.

## 4. Autorização do admin

Duas camadas em série:

1. **Sessão** — `_authenticated/route.tsx` (Fase 1, gerido pela integração):
   `ssr:false`, verifica `supabase.auth.getUser()`, redireciona sem sessão
   para `/auth`.
2. **Membership** — `_authenticated/admin.tsx` embrulha o `<Outlet />` em
   `OrgGate` (`src/components/admin/OrgGate.tsx`). Sem membership ativa
   → tela **"Acesso em análise"** com botão de reivindicação de owner.

Ações administrativas respeitam role via RLS (server-side) e são também
escondidas no UI conforme o role (`manager+` cria/edita, `admin+` exclui).

## 5. Bootstrap da organização e do primeiro owner

- A organização **Prudente em Foco** (`slug = prudente-em-foco`) é criada
  automaticamente pela migration da Fase 2 (idempotente).
- Não existe endpoint público para virar owner. O único caminho é a função
  `public.claim_first_owner(_org_slug text)`, `SECURITY DEFINER`, que:
  - exige `auth.uid()` (usuário logado);
  - só executa se a organização não tiver **nenhum** membro ativo com
    `role = 'owner'`;
  - insere `(org, uid, owner, active)` e registra `org.claim_first_owner`
    em `audit_logs`.
- Depois de reivindicado, a função sempre retorna erro
  `organization already has an owner`.
- **Procedimento**: o responsável técnico cria conta em `/auth`, entra
  em `/admin`, clica em "Reivindicar owner (Prudente em Foco)" na tela
  "Acesso em análise". A partir daí ele libera outros membros pela tabela
  `organization_members` (UI de convites virá em fase futura).

## 6. Auditoria

Toda mutação de evento chama `public.record_audit_event(...)`:

| Ação                    | Quando                                           |
| ----------------------- | ------------------------------------------------ |
| `event.create`          | criação                                          |
| `event.update`          | edição sem mudança de status                     |
| `event.status_change`   | edição com mudança de `status`                   |
| `event.archive`         | ação "Arquivar" na lista                         |
| `event.unarchive`       | reverter arquivamento                            |
| `event.delete`          | exclusão definitiva                              |
| `org.claim_first_owner` | reivindicação de owner                           |

Metadata guarda no mínimo `title`, `slug` e, quando aplicável, `from`/`to`
de status.

## 7. Rotas

**Público:**

- `/eventos` — lista eventos publicados (SSR-safe, loader via server fn).
- `/eventos/$slug` — página individual com meta OG, canonical, JSON-LD
  (`schema.org/Event`).

**Admin (`/_authenticated/admin/*`):**

- `/admin/eventos` — lista, filtros, busca, ações inline (editar/arquivar/excluir).
- `/admin/eventos/novo` — formulário de criação.
- `/admin/eventos/$id` — formulário de edição.

## 8. Segurança — o que **não** existe

- Nenhum caminho para service role no frontend.
- Nenhuma policy aberta para anon na tabela administrativa (a `TO anon`
  criada filtra por `status = 'published'`).
- Nenhuma forma pública de criar owner (só `claim_first_owner`, e uma vez).
- Sem bucket de Storage — capa continua como URL https válida.
  Storage seguro será tratado na subfase 2.1.
- Rascunhos nunca aparecem publicamente (policy filtra).

## 9. UX

- Mobile-first em todo o admin.
- Estados: loading, erro, vazio, sucesso, confirmação para destrutivo.
- Página pública com visual limpo, sem eventos inventados.
- SEO básico por evento (`title`, `description`, OG, canonical, JSON-LD).

## 10. O que ficou para fases futuras

- Subfase 2.1: bucket privado de capas com upload por membro autorizado.
- Fase 3+: convites de membros, tela de gestão de organização.
- Fases dedicadas: reservas, VIP, QR, scanner, promoters, credenciais,
  pagamentos, CRM, analytics, IA, agentes, Access Engine, relatórios.

## Superseded parcialmente pela Fase 2.1

A leitura pública direta de `public.events` foi removida; ver
`docs/PHASE_2_1_PUBLIC_PROJECTION_STORAGE.md` para a nova projeção
pública via RPC e o storage seguro de capas.
