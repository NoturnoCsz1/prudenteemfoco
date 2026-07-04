# Fase 2.1 — Projeção pública de eventos + Storage seguro

Esta subfase separa a projeção pública da tabela administrativa
`public.events` e introduz storage seguro para as capas dos eventos.

## 1. Por que remover o SELECT `anon` de `public.events`

Antes, o cliente anônimo tinha `GRANT SELECT` na tabela administrativa,
filtrado por policy `status = 'published'`. Isso funcionava, mas:

- expunha a superfície inteira da tabela (colunas, PKs, timing de queries);
- qualquer erro futuro de policy poderia vazar rascunhos ou dados
  operacionais;
- misturava a semântica administrativa e pública no mesmo objeto.

A projeção pública agora é feita por **duas funções SQL**, e o SELECT
direto de `anon` foi revogado.

## 2. Solução escolhida — RPC SECURITY DEFINER

Optamos por **funções SQL** em vez de VIEW porque:

- controle absoluto sobre as colunas retornadas (`SELECT` explícito, nada
  de `SELECT *`);
- filtragem `status = 'published'` embutida no corpo da função — impossível
  ignorar do lado do cliente;
- não requer conceder `SELECT` à tabela base para `anon`;
- não depende de `security_invoker` do Postgres 15+ e evita as
  complicações de VIEW + RLS;
- superfície mínima: dois nomes de função, argumentos tipados.

### Funções criadas

- `public.list_published_events() → TABLE(...)`
- `public.get_published_event_by_slug(_slug text) → TABLE(...)`

Ambas:

- `LANGUAGE sql`, `STABLE`, `SECURITY DEFINER`;
- `search_path` fixado em `public`;
- `EXECUTE` revogado de `PUBLIC` e concedido apenas a `anon, authenticated`;
- retornam somente registros com `status = 'published'`;
- não aceitam parâmetros que permitam SQL dinâmico
  (`_slug` é `text` usado apenas em `=` no `WHERE`).

### Campos públicos expostos

`title, slug, starts_at, ends_at, venue_name, city, short_description,
cover_image_url`.

Nenhum identificador interno (`id`, `organization_id`), timestamps
administrativos (`created_at`, `updated_at`) ou o campo `status` são
retornados publicamente.

### Regra de publicação

Apenas linhas com `events.status = 'published'` aparecem na projeção. A
regra vive no banco. `draft`, `scheduled`, `cancelled` e `archived`
permanecem invisíveis.

## 3. Grants alterados

- `REVOKE SELECT ON public.events FROM anon;` — o cliente anônimo não
  consulta mais a tabela administrativa.
- Policy `events_select_public_published` removida — não é mais necessária.
- `GRANT EXECUTE ON FUNCTION public.list_published_events() TO anon, authenticated;`
- `GRANT EXECUTE ON FUNCTION public.get_published_event_by_slug(text) TO anon, authenticated;`

## 4. Storage — bucket `event-covers`

- Bucket criado como **privado** (a política do workspace bloqueia
  buckets públicos — `public_buckets_blocked`).
- Consumo público das capas: **URLs assinadas de longa duração** (TTL
  100 anos, geradas no momento do upload e guardadas em
  `events.cover_image_url`).
- Uso exclusivo: capa de eventos institucionais. Nada de documentos
  privados, credenciais, QR, comprovantes, contratos ou dados pessoais.

### Estratégia de paths

```
{organization_id}/{event_id}/{uuid}.{jpg|png|webp}
```

- Isolamento por organização: a policy do Storage extrai o primeiro
  segmento do path e valida `has_org_role_at_least(auth.uid(), org_id,
  'manager')` via helper `public.can_manage_event_cover(_path text)`.
- Nome baseado em `crypto.randomUUID()` — evita colisão global,
  sobrescrita acidental e path traversal.
- Extensão derivada do MIME validado, nunca do nome original.

### MIME types e tamanho

- Permitidos: `image/jpeg`, `image/png`, `image/webp`.
- SVG, HTML e executáveis são proibidos nesta fase.
- Limite: 5 MB por arquivo (validado no cliente).

> Nota: o workspace bloqueou `UPDATE storage.buckets`, então as
> restrições de MIME e tamanho não puderam ser fixadas no bucket. A
> validação vive no cliente e o RLS do bucket impede uploads não
> autorizados. Em uma subfase futura, se o workspace permitir, mover
> essas restrições para o próprio bucket.

## 5. Policies do Storage (`storage.objects`)

Todas escopadas a `bucket_id = 'event-covers'`:

| Ação | Regra |
|------|-------|
| SELECT | `authenticated` + `can_manage_event_cover(name)` — administrativo apenas. Público consome via URL assinada. |
| INSERT | `authenticated` + `owner = auth.uid()` + `can_manage_event_cover(name)` |
| UPDATE | `authenticated` + `can_manage_event_cover(name)` (USING e WITH CHECK) |
| DELETE | `authenticated` + `can_manage_event_cover(name)` |

`can_manage_event_cover(_path)` é `SECURITY DEFINER`, `search_path=public`,
`EXECUTE` restrito a `authenticated`. Extrai `organization_id` do primeiro
segmento do path e delega para `has_org_role_at_least(..., 'manager')`.

Portanto: `owner`, `admin` e `manager` podem enviar/substituir/remover.
`operator` e `viewer` são negados pelas policies. `anon` é negado por não
constar em `TO`.

## 6. Fluxo de upload

Integrado ao `EventForm` (edit mode apenas):

1. usuário seleciona arquivo;
2. cliente valida MIME e tamanho;
3. `supabase.storage.from('event-covers').upload(path, file, { upsert: false })`;
4. gera URL assinada (`createSignedUrl`, TTL 100 anos);
5. `onChange` grava a URL no campo `cover_image_url` do formulário;
6. auditoria `event.cover_uploaded` ou `event.cover_replaced`;
7. capa anterior é removida por best-effort **apenas se o path pertencer
   ao mesmo `{org_id}/{event_id}`** — nunca com base em URL arbitrária.

O modo `create` mantém o campo de URL textual para não deixar o form
sem nenhuma opção; a UX orienta o usuário a salvar o evento primeiro
para usar o upload seguro (o path do storage precisa do `event_id`).

## 7. Estratégia de substituição / remoção

- Substituir: upload do novo arquivo → gera URL assinada → grava no
  form → remove o path anterior se ele pertence a este mesmo evento.
- Remover: apaga o path anterior (se do mesmo evento) e zera
  `cover_image_url`.
- Nunca decidimos o que apagar com base na URL enviada pelo cliente sem
  antes checar o prefixo `{org_id}/{event_id}/`.

## 8. Auditoria

Ações registradas em `audit_logs` quando aplicável:

- `event.cover_uploaded` — primeira capa do evento;
- `event.cover_replaced` — substituição de capa existente;
- `event.cover_removed` — remoção da capa.

Metadata mínima: `{ storage_path }`. Nenhum token, secret ou binário é
registrado.

## 9. Riscos residuais

1. **Bucket privado + URL assinada TTL 100 anos.** Enquanto o workspace
   bloquear buckets públicos, dependemos de URLs assinadas. Se a chave de
   assinatura do Supabase for rotacionada, as URLs armazenadas quebram.
   Mitigação futura: quando buckets públicos forem liberados, migrar para
   `getPublicUrl` e uma migração para reescrever `cover_image_url`
   existente.
2. **Arquivos órfãos.** Se o usuário sair da edição sem salvar depois de
   trocar a capa, o arquivo antigo pode ficar no storage (o antigo é
   removido no fluxo de substituição, mas o novo pode ficar sem apontar
   para lugar algum se o form nunca for salvo). Fase 2.1 não implementa
   garbage collection — aceito como risco residual.
3. **Restrições de MIME/tamanho no bucket.** `UPDATE storage.buckets` é
   bloqueado pelo workspace, então as restrições vivem no cliente e nas
   policies. Uploads via cliente autorizado ainda podem enviar mimes
   fora da lista se contornarem a UI; policies negariam apenas por
   `owner`/`can_manage_event_cover`, não por MIME. Aceito nesta fase.
4. **Grafo de anon executando funções `SECURITY DEFINER`.** As duas RPCs
   públicas são intencionalmente executáveis por `anon`; retornam apenas
   colunas seguras e filtram `status = 'published'`. O linter registra o
   warning esperado.

## 10. Testes realizados

| Cenário | Resultado |
|---------|-----------|
| A. anon lista publicados via `list_published_events` | ✔ policies + grant OK; build valida tipos gerados |
| B. anon tenta `SELECT` direto em `public.events` | ✔ negado — grant revogado |
| C. slug de rascunho em `/eventos/$slug` | ✔ RPC retorna vazio → `notFound()` → 404 |
| D. usuário autenticado sem membership tenta upload | ✔ `can_manage_event_cover` retorna false |
| E. viewer tenta upload | ✔ negado (`has_org_role_at_least('manager')` = false) |
| F. manager envia JPEG/PNG/WebP válido | ✔ policy passa, path `{org}/{event}/…` |
| G. arquivo inválido ou > 5 MB | ✔ rejeitado no cliente |
| H. evento publicado aparece na listagem/detalhe | ✔ RPCs retornam |
| I. evento deixa de ser `published` | ✔ RPCs filtram por status |

Build: `bun run build` passa sem erros.

## 11. O que **NÃO** foi implementado

Nenhuma antecipação de módulos futuros: reservas, VIP, promoters, QR,
scanner, convites, credenciais, pagamentos, CRM, analytics, IA, agentes,
Access Engine, gestão de membros, relatórios, galeria de fotos, múltiplas
imagens por evento ou editor de imagem.
