# Arquitetura — Prudente em Foco

## Objetivo da Fase 1

Adicionar à fundação da Fase 0: **autenticação, banco, permissões e
auditoria inicial**, mantendo a plataforma leve e sem antecipar
funcionalidades operacionais. Ver [`SECURITY.md`](./SECURITY.md) para o
detalhamento de segurança e [`ROADMAP_RULES.md`](./ROADMAP_RULES.md).

## Estrutura atual

```
src/
  routes/
    __root.tsx                          # shell HTML, metadata, providers, Toaster
    auth.tsx                            # /auth — login/signup público
    _site.tsx                           # layout público (Header + Footer)
    _site.index.tsx                     # /
    _site.eventos.tsx                   # /eventos
    _site.experiencias.tsx              # /experiencias
    _site.sobre.tsx                     # /sobre
    _site.contato.tsx                   # /contato
    _authenticated/
      route.tsx                         # gate de autenticação (ssr:false)
      admin.tsx                         # layout administrativo
      admin.index.tsx                   # /admin
      admin.eventos.tsx                 # /admin/eventos
      admin.experiencias.tsx            # /admin/experiencias
      admin.operacao.tsx                # /admin/operacao
      admin.configuracoes.tsx           # /admin/configuracoes
  components/
    site/                               # experiência pública
    admin/                              # shell administrativo
  hooks/
    use-session.ts                      # observa sessão Supabase para a UI
  integrations/supabase/                # clientes gerados (não editar)
  styles.css                            # design system (tokens oklch)

docs/
  ARCHITECTURE.md
  ROADMAP_RULES.md
  SECURITY.md                           # modelo de segurança (Fase 1)

supabase/
  migrations/                           # migrations versionadas
```

Toda rota administrativa vive sob `_authenticated/`. Usuário sem sessão é
redirecionado a `/auth` preservando o destino. A área pública nunca
depende de sessão.

## Decisões arquiteturais

1. **File-based routing (TanStack Start)** — sem `src/pages/`, sem
   duplicidade de convenções.
2. **Dois layouts independentes** — `_site` para experiência pública,
   `admin` para operação. Isso permite:
   - carregamento independente;
   - futuro gate de autenticação isolado no admin;
   - evolução visual sem interferência mútua.
3. **Design system em `src/styles.css`** — todas as cores são tokens
   `oklch` semânticos (background, foreground, primary, surface, gold,
   border, etc.). Nenhum componente usa `text-white`, `bg-black` ou
   valores hard-coded.
4. **Sem backend nesta fase** — nenhuma tabela, Edge Function ou secret
   foi criado. A integração real acontecerá em fase própria.
5. **Sem bibliotecas pesadas** — nada de mapas, gráficos, scanners,
   editores, IA. Apenas o que é necessário para renderizar o esqueleto.
6. **Mobile-first, desktop-enhanced** — a navegação pública e o shell
   admin nascem mobile-first; o desktop é enriquecido (sidebar fixa).

## Regras de segurança (aplicadas desde a fundação)

- Nenhum secret, service role ou credencial no frontend.
- Nenhum endpoint administrativo público.
- Nenhuma role fictícia ou permissão apenas cosmética.
- Toda futura ação crítica será validada **server-side** com
  idempotência, trilha de auditoria e princípio do menor privilégio.
- IA e agentes **auxiliam** — nunca executam ações críticas sem
  autorização humana explícita.

## Módulos futuros (não implementados)

Reservados para fases próprias, com arquitetura modular em
`features/<dominio>/{components,hooks,services,types,schemas,utils}`:

- Events, Experiences, Operations, Reservations, VIP, Invitations,
  Promoters, Credentials, **Access Engine**, CRM, Audit, AI Agents.

Nenhum menu, tabela ou rota destes domínios foi criado nesta fase.

## Estratégia mobile e desktop

- **Mobile (público):** velocidade, clareza, poucos passos, CTAs
  objetivos.
- **Mobile (admin):** ações rápidas — consultas, validações, aprovações
  (a serem implementadas por fase).
- **Desktop (admin):** profundidade — relatórios, comparações, análise,
  auditoria (a serem implementadas por fase).

## Backlog de Evolução

Toda nova ideia surgida durante o desenvolvimento é **registrada
conceitualmente** e avaliada na fase apropriada. Ver
[`ROADMAP_RULES.md`](./ROADMAP_RULES.md).

## Dependências utilizadas

Apenas o stack já presente no template:

- `@tanstack/react-router` / `@tanstack/react-start` — routing e SSR.
- `@tanstack/react-query` — infraestrutura de dados (não usada ainda,
  reservada para fases seguintes).
- `tailwindcss` v4 — estilo utilitário via tokens.
- `lucide-react` — ícones institucionais leves.

**Nenhuma dependência nova foi adicionada nesta fase.**

---

## Fase 2 (delta)

- Eventos passa a ser a primeira unidade real: CRUD administrativo em `/admin/eventos/*` + páginas públicas em `/eventos` e `/eventos/$slug`.
- Leituras públicas via `createServerFn` em `src/lib/events.functions.ts` (server publishable client, RLS como `anon`).
- `OrgGate` (`src/components/admin/OrgGate.tsx`) adiciona segunda camada no admin: sessão + membership ativa. Sem membership → "Acesso em análise" com ação de reivindicação de owner.
- Formulário de evento com React Hook Form + Zod. Auditoria em todas as mutações via `record_audit_event`.
- Detalhe: ver `docs/PHASE_2_EVENTS.md`.

## Fase 2.1 (delta)

- Leitura pública de eventos deixa de vir de `SELECT` direto na tabela administrativa e passa a vir de duas RPCs `SECURITY DEFINER` (`list_published_events`, `get_published_event_by_slug`).
- `anon` não tem mais `SELECT` em `public.events`.
- Novo bucket privado `event-covers` para capas, com paths `{org_id}/{event_id}/{uuid}.{ext}`, RLS por role via helper `can_manage_event_cover`.
- Capas consumidas via URL assinada (bucket privado por política do workspace).
- Ver `docs/PHASE_2_1_PUBLIC_PROJECTION_STORAGE.md`.

## Fase 3 (delta)

- Modelo operacional do evento: `event_sectors`, `reservable_space_types`, `reservable_spaces` — integridade cruzada garantida por foreign keys compostas em `(id, event_id, organization_id)`.
- Enums novos: `sector_status`, `space_type_status`, `space_operational_status`. Estados **comerciais** (reservado/pago) permanecem fora do inventário físico.
- RPC `generate_reservable_spaces(_space_type_id, _quantity, _prefix, _pad, _start_number)` para geração idempotente de unidades (limite 500/chamada, `ON CONFLICT DO NOTHING`).
- Admin contextual por evento: `/admin/eventos/$id`, `/admin/eventos/$id/setores`, `/admin/eventos/$id/espacos`.
- **Decisão de arquitetura:** VIP, Front Stage e Open Bar são **setores** do evento. Bistrôs, Mesas e Camarotes são **inventário reservável** separado.
- Ver `docs/PHASE_3_EVENT_OPERATIONS.md`.
