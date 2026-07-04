# Fase 3 — Modelo Operacional Base do Evento

Esta fase transforma o evento numa unidade **operacional**: setores, tipos
de espaços reserváveis e as unidades físicas desse inventário. Reservas,
pagamentos, QR, scanner, promoters, credenciais e Access Engine NÃO são
implementados aqui.

## 1. Decisão de modelagem

**O Prudente em Foco não possui módulo independente chamado VIP.** Área
VIP, Front Stage, Open Bar e categorias semelhantes são modeladas como
**setores** do evento. Espaços físicos limitados — Bistrôs, Mesas,
Camarotes — são modelados separadamente como **inventário reservável**.

Um setor pode existir sem espaço reservável. Um espaço reservável pode
apontar (opcionalmente) para um setor. Nunca são a mesma coisa.

## 2. Tabelas criadas

### `event_sectors`
Categorias de acesso a um evento.

| campo | descrição |
|-------|-----------|
| `id` | PK |
| `event_id`, `organization_id` | escopo obrigatório |
| `name` | 1..120 chars |
| `slug` | regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 1..80, **único por evento** |
| `description` | ≤ 600 chars |
| `capacity` | inteiro > 0, opcional |
| `sort_order` | int, default 0 |
| `status` | enum `sector_status` |

### `reservable_space_types`
Categorias de espaço (Bistrô, Mesa 4, Camarote 10, …).

| campo | descrição |
|-------|-----------|
| `id` | PK |
| `event_id`, `organization_id` | escopo obrigatório |
| `sector_id` | opcional, mesmo evento/org por FK composta |
| `name` | 1..120 chars |
| `description` | ≤ 600 chars |
| `capacity_per_unit` | inteiro > 0, opcional |
| `base_price` | `numeric(12,2)` ≥ 0 (dado administrativo — sem cobrança) |
| `currency` | ISO 3 letras, default `BRL` |
| `status` | enum `space_type_status` |
| `sort_order` | int |

### `reservable_spaces`
Unidades físicas do inventário (Camarote 01, Bistrô 001, …).

| campo | descrição |
|-------|-----------|
| `id` | PK |
| `organization_id`, `event_id`, `space_type_id` | escopo obrigatório |
| `sector_id` | opcional |
| `code` | 1..60 chars, **único por (event_id, space_type_id, code)** |
| `display_name` | opcional |
| `capacity` | inteiro > 0, opcional |
| `operational_status` | enum `space_operational_status` |
| `sort_order`, `notes` | ordem/observações internas |

## 3. Enums

| enum | valores |
|------|---------|
| `sector_status` | `active`, `inactive`, `archived` |
| `space_type_status` | `active`, `inactive`, `archived` |
| `space_operational_status` | `available`, `blocked`, `maintenance`, `inactive` |

**Estados comerciais** (`reserved`, `pending_payment`, `paid`, `sold_out`)
NÃO existem em `space_operational_status`. Eles pertencem ao futuro
domínio de reservas/transações.

## 4. Integridade (garantida pelo banco)

Composite unique keys + composite foreign keys eliminam inconsistências
sem depender de triggers:

- `events (id, organization_id)` — unique composto.
- `event_sectors (id, event_id, organization_id)` — unique composto.
  - FK `(event_id, organization_id) → events(id, organization_id)`.
- `reservable_space_types (id, event_id, organization_id)` — unique composto.
  - FK `(event_id, organization_id) → events(id, organization_id)`.
  - FK `(sector_id, event_id, organization_id) → event_sectors(...)` `ON DELETE SET NULL`.
- `reservable_spaces`
  - FK `(space_type_id, event_id, organization_id) → reservable_space_types(...)` `ON DELETE RESTRICT`.
  - FK `(sector_id, event_id, organization_id) → event_sectors(...)` `ON DELETE SET NULL`.

Portanto o banco recusa:
- setor de organização A associado a evento de organização B;
- tipo de espaço apontando para setor de outro evento;
- unidade apontando para tipo de outro evento;
- unidade apontando para setor de outro evento;
- exclusão de tipo com unidades ainda ligadas (`RESTRICT`).

## 5. RLS

`ENABLE ROW LEVEL SECURITY` nas três tabelas. Deny-by-default.

| Ação | Papel exigido |
|------|---------------|
| SELECT | membro ativo (`is_active_org_member`) |
| INSERT | `manager` ou superior |
| UPDATE | `manager` ou superior |
| DELETE | `admin` ou superior + sem dependências (FK `RESTRICT` bloqueia) |

Papéis `operator` e `viewer` são **apenas leitura** nesta fase, conforme
briefing. `anon` não tem `TO` em nenhuma policy destas tabelas.

## 6. Geração de inventário em lote

Função `public.generate_reservable_spaces(_space_type_id, _quantity,
_prefix, _pad, _start_number)`:

- `SECURITY DEFINER`, `search_path=public`, `EXECUTE` restrito a
  `authenticated`.
- Verifica `auth.uid()` e `has_org_role_at_least(..., 'manager')` para a
  organização do tipo.
- Limites: `1 ≤ quantity ≤ 500`, `1 ≤ pad ≤ 6`, `start_number ≥ 0`,
  `1 ≤ len(prefix) ≤ 40`.
- Gera códigos `"{prefix} {N:pad}"`, ex.: `Bistrô 001`.
- `INSERT ... ON CONFLICT (event_id, space_type_id, code) DO NOTHING` →
  **idempotente**: repetir o mesmo lote não cria duplicatas.
- Retorna `(created_count, skipped_count)`.
- Registra `space.bulk_created` em `audit_logs`.

Fluxo administrativo:
1. Usuário informa prefixo, quantidade, dígitos e início.
2. Prévia dos primeiros 5 códigos.
3. Confirmação humana explícita.
4. Chamada RPC.
5. Toast com `created / skipped`.

Nenhum service role é usado no frontend.

## 7. Fluxo administrativo

```
Admin → Eventos → selecionar evento → Operação
                                       ├── Detalhes (form do evento)
                                       ├── Setores
                                       └── Espaços (tipos + unidades)
```

Rotas:
- `/admin/eventos/$id` — detalhes.
- `/admin/eventos/$id/setores` — CRUD de setores (mobile-first: cards,
  botões subir/descer, select de status inline).
- `/admin/eventos/$id/espacos` — CRUD de tipos, expansão para ver
  unidades, gerador em lote por tipo.

Nenhum menu global lista setores/tipos/espaços entre eventos — a operação
é sempre contextual ao evento.

## 8. UX mobile-first

- Cards empilhados por padrão; tabelas evitadas no mobile.
- Ações contextuais em botões pequenos por linha.
- Ordenação por controles simples (subir/descer) — sem drag-and-drop.
- Formulários inline com botão de fechar (X) e botões primários grandes.
- Nenhum dashboard/gráfico.

## 9. Auditoria

Todas as mutações administrativas gravam em `audit_logs`:

| Ação | Origem |
|------|--------|
| `sector.created`, `sector.updated`, `sector.status_changed`, `sector.archived` | admin/setores |
| `space_type.created`, `space_type.updated`, `space_type.status_changed` | admin/espaços |
| `space.status_changed` | admin/espaços (unidade) |
| `space.bulk_created` | RPC `generate_reservable_spaces` |

Metadata mínima: `event_id`, `space_type_id`, códigos, `from`/`to` de
status. Nenhum payload sensível.

## 10. Testes (cenários A–J)

| # | Cenário | Resultado |
|---|---------|-----------|
| A | anon acessa `/admin/*` | redirecionado a `/auth` pelo layout `_authenticated` |
| B | autenticado sem membership acessa operação | bloqueado pelo `OrgGate` |
| C | viewer tenta criar setor | RLS nega (`has_org_role_at_least('manager')` = false) |
| D | operator tenta editar espaço | RLS nega |
| E | manager cria setor no próprio evento | ✔ |
| F | manager tenta associar espaço a tipo de outro evento | FK composta `(space_type_id, event_id, organization_id)` recusa |
| G | geração em lote cria códigos únicos | ✔ via unique `(event_id, space_type_id, code)` |
| H | repetir o mesmo lote | `ON CONFLICT DO NOTHING` → `skipped_count > 0`, sem duplicatas |
| I | bloquear espaço | `operational_status = 'blocked'`; registro persiste |
| J | mutação administrativa gera `audit_log` | ✔ (RPC `record_audit_event`) |

Build (`bun run build`) passa sem erros.

## 11. Publicação pública

Nada é exposto publicamente nesta fase. Não existe `TO anon` nas
policies das novas tabelas, nem RPC pública que retorne setores/espaços.
A exposição pública fica para uma fase específica do fluxo comercial.

## 12. Riscos residuais

1. **Ordenação linear.** `sort_order` é editável, mas usa botões
   subir/descer que fazem dois `UPDATE`s. Aceito nesta fase.
2. **Sem soft-delete formal.** `archived` cobre a maior parte dos casos;
   `DELETE` real permanece disponível para `admin+`, mas bloqueado por FK
   `RESTRICT` em tipos com unidades. Casos com histórico futuro (reservas)
   precisarão de estratégia dedicada nas fases seguintes.
3. **`base_price` administrativo.** Já persistido como `numeric(12,2)`,
   mas nenhum fluxo comercial usa esse valor. Fase futura definirá
   pricing/cobrança real.
4. **Ligação `sector_id` em `reservable_spaces` pode divergir do
   `sector_id` do `reservable_space_types`.** Ambos apontam para setores
   do mesmo evento (FK composta garante isso), mas podem ser setores
   diferentes por design — permite unidades com override de setor. Se
   isso não for desejado numa fase futura, adicionar constraint.

## 13. Módulos deliberadamente NÃO implementados

Reservas, checkout, PIX, cartão, gateway, bloqueio temporário, carrinho,
comprovante, QR, check-in, scanner, promoter, comissão, convite,
credencial, lista VIP, ingresso próprio, integração com ticketing, mapa
visual/seat map, drag-and-drop, Access Engine, publicação pública de
setores/espaços, cliente final reservando.
