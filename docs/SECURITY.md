# Segurança — Prudente em Foco

Este documento descreve o modelo de segurança da Fase 1 e o que ainda não
está implementado. Ele deve ser atualizado a cada fase que altere a
postura de segurança do projeto.

## Modelo de autenticação

- Provedor: Lovable Cloud Auth (Supabase Auth).
- Método ativo: e-mail + senha.
- Confirmação de e-mail automática nesta fase (fluxo de bootstrap). Deve
  ser reavaliada em fase futura com fluxo de convite formal.
- Verificação HIBP (senhas vazadas) ativa.
- OAuth social (Google/Apple) **não** ativado nesta fase.
- Sessão armazenada em `localStorage` pelo cliente Supabase. A área
  administrativa é gated `ssr: false` — a checagem ocorre no cliente
  antes do render.

## Modelo de papéis (RBAC)

Os papéis são **por organização**, armazenados em
`public.organization_members.role`. Hierarquia (do maior para o menor):

| Papel      | Rank | Descrição                                       |
|------------|------|-------------------------------------------------|
| `owner`    | 50   | Poderes máximos sobre a organização             |
| `admin`    | 40   | Administração ampla, incluindo audit_logs       |
| `manager`  | 30   | Gestão operacional (eventos)                    |
| `operator` | 20   | Operação diária (uso futuro)                    |
| `viewer`   | 10   | Leitura                                          |

Papéis globais (super-admin) **não** existem nesta fase e serão
introduzidos em fase própria, em tabela separada, seguindo o padrão
recomendado (nunca armazenar papéis no profile).

## Regras de acesso a dados (RLS)

**Padrão: negar tudo.** RLS está ativa em todas as tabelas. Apenas as
policies abaixo permitem acesso.

### `profiles`
- `SELECT`, `UPDATE`, `INSERT`: apenas o próprio usuário (`auth.uid() = user_id`).
- `DELETE`: nenhuma policy — exclusão ocorre por cascade quando o
  usuário é apagado em `auth.users`.

### `organizations`
- `SELECT`: membros ativos da organização (`is_active_org_member`).
- `UPDATE`: apenas papel `admin` ou superior (`has_org_role_at_least(..., 'admin')`).
- `INSERT` / `DELETE`: bloqueados no cliente — criação/exclusão será
  server-side em fase futura.

### `organization_members`
- `SELECT`: o próprio usuário (seu vínculo) ou papel `admin` ou superior
  da organização.
- `INSERT` / `UPDATE` / `DELETE`: bloqueados no cliente — gestão de
  membros será server-side em fase futura.

### `events`
- `SELECT`: membros ativos da organização.
- `INSERT` / `UPDATE`: papel `manager` ou superior.
- `DELETE`: papel `admin` ou superior (proteção extra para operações
  destrutivas).
- **Sem** acesso `anon`. Publicação pública de eventos exigirá uma policy
  dedicada (`TO anon`) com projeção de colunas em fase própria.

### `audit_logs`
- `SELECT`: papel `admin` ou superior da organização.
- `INSERT` / `UPDATE` / `DELETE`: **sem policies** — o cliente **não pode**
  escrever nem alterar. Escrita será feita apenas via
  `public.record_audit_event()` a partir de server functions confiáveis.

## Funções auxiliares

Todas as funções têm `search_path` fixado em `public`.

| Função                         | `SECURITY DEFINER`? | Motivo |
|---------------------------------|--------------------|--------|
| `is_active_org_member`          | Sim                | Evita recursão infinita nas policies de `organization_members`. |
| `has_org_role_at_least`         | Sim                | Idem. Consulta `organization_members` a partir de policies de outras tabelas. |
| `role_rank`                     | Não                | Função pura utilitária. |
| `handle_new_user`               | Sim                | Precisa gravar em `public.profiles` a partir de trigger em `auth.users`. |
| `record_audit_event`            | Sim                | Escrita da trilha de auditoria server-side, sem policy de INSERT no cliente. |
| `set_updated_at`                | Não                | Trigger utilitário. |

### Grants das funções

- `set_updated_at`, `handle_new_user`: revogadas de `public/anon/authenticated`
  (uso via trigger).
- `record_audit_event`: revogada de `public/anon/authenticated`, concedida
  apenas a `service_role`.
- `role_rank`, `is_active_org_member`, `has_org_role_at_least`: revogadas
  de `anon`, concedidas a `authenticated` e `service_role` (necessário
  para que as policies de RLS funcionem para o usuário autenticado).

## Grants nas tabelas

Todas as tabelas do schema `public` recebem `GRANT` explícito, conforme
requisito da Data API. Nenhuma tabela tem `GRANT` para `anon` nesta fase.

## Decisões de segurança

1. **Nenhum secret ou service role no frontend.** O cliente do navegador
   usa apenas a chave publishable. `client.server.ts` (service role) só é
   importado dinamicamente dentro de handlers de server functions.
2. **`/admin` só existe atrás do gate `_authenticated`.** Usuário sem
   sessão é redirecionado para `/auth` preservando o destino.
3. **`_authenticated` usa `ssr: false`** porque a sessão vive no
   `localStorage`. Isso evita loops de redirect no refresh e piscadas
   de tela para usuários já autenticados.
4. **Papéis nunca ficam no `profiles`.** Ficam em `organization_members`
   (tabela dedicada), consultados por função `SECURITY DEFINER` — padrão
   documentado para evitar escalonamento de privilégio.
5. **`audit_logs` é write-only para servidores confiáveis.** O cliente
   não pode inserir, atualizar ou apagar registros.
6. **`record_audit_event` só executa como `service_role`.** Qualquer
   escrita de auditoria futura precisará passar por uma server function
   validada.

## O que ainda **não** foi implementado

- OAuth social (Google/Apple).
- Recuperação de senha (`/reset-password` + `resetPasswordForEmail`).
- MFA / verificação em duas etapas.
- Fluxo formal de convite (criação/gestão de membros) — atualmente não é
  possível gerenciar `organization_members` pelo cliente.
- CRUD administrativo de organizações e eventos no frontend.
- Trilha de auditoria disparada por eventos reais.
- Rate limiting em endpoints administrativos.
- Consentimento e política de privacidade públicos.
- Testes automatizados de RLS.

## Riscos conhecidos e aceitos nesta fase

- **`auto_confirm_email = true`.** Facilita o bootstrap inicial da
  plataforma. Deve ser desligado antes de qualquer abertura pública,
  substituindo o cadastro aberto por convite formal.
- **Signup aberto.** Qualquer visitante pode criar uma conta em `/auth`.
  Contas recém-criadas **não** são associadas a nenhuma organização
  automaticamente, portanto **não** obtêm acesso a dados administrativos
  (RLS bloqueia). Ainda assim, o cadastro público será substituído por
  convite formal em fase própria.
- **`is_active_org_member` e `has_org_role_at_least` são executáveis por
  `authenticated`.** Necessário para o funcionamento das policies. Um
  usuário autenticado pode consultar se ele mesmo é membro de uma
  organização (o que já é permitido pela policy) — não expõe dados de
  terceiros.
- **Sem CAPTCHA/rate limit no `/auth`.** A camada Cloud fornece
  proteções básicas; controles finos serão adicionados em fase própria.

## Próximos passos de segurança

1. Fluxo de convite formal + desativar `auto_confirm_email` e signup público.
2. `/reset-password` + fluxo de recuperação de senha.
3. Google/Apple OAuth via Cloud managed provider.
4. Server functions administrativas para CRUD de eventos e membros.
5. Registro real de eventos de auditoria via `record_audit_event`.
6. Suite de testes automatizados de RLS.

---

## Fase 2 (delta)

### Leitura pública controlada
- Nova policy `events_select_public_published` em `public.events`: `anon` e `authenticated` só veem linhas com `status = published`.
- `GRANT SELECT ON public.events TO anon` habilita o Data API — filtragem pela policy acima.
- Todos os outros status (`draft`, `scheduled`, `cancelled`, `archived`) permanecem invisíveis para o público.

### Bootstrap seguro de owner
- `public.claim_first_owner(_org_slug text)` (`SECURITY DEFINER`, `search_path=public`): concede `role=owner` ao `auth.uid()` chamador **apenas** quando a organização não tem nenhum owner ativo. Após a primeira reivindicação, sempre falha.
- A ação é registrada em `audit_logs` (`action = org.claim_first_owner`).
- Não existe caminho no frontend que crie/eleve owners fora dessa função.

### Autorização em duas camadas no admin
- Camada 1 (sessão): `_authenticated/route.tsx` (`ssr:false`, redirect para `/auth`).
- Camada 2 (membership): `OrgGate` bloqueia usuários logados sem membership ativa.
- Ações administrativas dependem de role no RLS (`has_org_role_at_least`); UI também esconde botões conforme role, mas o RLS é a fonte da verdade.

### Auditoria de eventos
Ações logadas: `event.create`, `event.update`, `event.status_change`, `event.archive`, `event.unarchive`, `event.delete`, `org.claim_first_owner`. Metadata inclui `title`, `slug` e, quando aplicável, `from`/`to` de status.

### O que continua fora do escopo
- Storage de capas (fica para 2.1) — hoje é apenas URL https validada por Zod.
- Nenhum endpoint público expõe rascunhos.
- Service role e secrets permanecem exclusivamente server-side.

---

## Fase 2.1 (delta)

### Projeção pública separada da tabela administrativa
- `REVOKE SELECT ON public.events FROM anon` — `anon` não consulta mais a tabela administrativa.
- Policy `events_select_public_published` removida.
- Duas RPCs `SECURITY DEFINER` `search_path=public` fornecem projeção pública, retornando apenas colunas seguras e `status='published'`:
  - `public.list_published_events()`
  - `public.get_published_event_by_slug(_slug text)`
- `EXECUTE` revogado de `PUBLIC` e concedido a `anon, authenticated`.

### Storage — bucket `event-covers`
- Bucket **privado** (workspace bloqueia buckets públicos). Consumo público via URL assinada de longa duração.
- Path: `{organization_id}/{event_id}/{uuid}.{jpg|png|webp}`.
- Policies em `storage.objects`, todas escopadas a `bucket_id='event-covers'`:
  - SELECT: `authenticated` + `can_manage_event_cover(name)`.
  - INSERT: `authenticated` + `owner = auth.uid()` + `can_manage_event_cover(name)`.
  - UPDATE/DELETE: `authenticated` + `can_manage_event_cover(name)`.
- Helper `public.can_manage_event_cover(_path text)` (`SECURITY DEFINER`, `search_path=public`, `EXECUTE` restrito a `authenticated`) delega para `has_org_role_at_least(..., 'manager')`. Portanto `owner`/`admin`/`manager` podem gravar; `operator`/`viewer`/`anon` não.

### Novos eventos de auditoria
`event.cover_uploaded`, `event.cover_replaced`, `event.cover_removed`. Metadata mínima `{ storage_path }`.

### Riscos residuais aceitos
- URLs assinadas TTL 100 anos: quebram se a chave de assinatura do Supabase for rotacionada. Migrar para `getPublicUrl` quando buckets públicos forem liberados no workspace.
- Restrições de MIME/tamanho no bucket não puderam ser aplicadas (`UPDATE storage.buckets` bloqueado); validação vive no cliente.
- Possíveis arquivos órfãos ao trocar capa sem salvar o form. Sem garbage collection nesta fase.
