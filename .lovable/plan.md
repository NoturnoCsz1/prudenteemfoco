## Fase 8.3 — Construtor de Hotsite por Evento

Escopo grande. Vou entregar em uma sequência controlada, priorizando fundação (schema + settings + patrocinadores + banners + notícias) e renderização pública data-driven. Line-up, ingressos externos e experiências já existem — serão apenas reaproveitados no hotsite.

### 1. Auditoria (o que já existe, não recriar)

- `event_attractions` → line-up (reusar).
- `events.external_ticket_url` → ingresso único (reusar; ampliar via banners/links se preciso).
- `reservable_space_types` + `reservable_spaces` + `space_reservation_requests` → experiências (reusar RPCs `list_available_space_types_by_slug` e `create_public_space_reservation_request`).
- `events` já tem: `title, slug, starts_at, ends_at, venue_name, city, short_description, long_description, cover_image_url, instagram_url, external_ticket_url, kind, format`.
- Storage `event-covers` bucket + `can_manage_event_cover` → reusar para logos/banners/imagens de notícia usando o mesmo prefixo `<org_id>/...`.

### 2. Migração (uma migração única)

Novas tabelas em `public`, todas com `organization_id`, `event_id`, `created_at`, `updated_at`, trigger `set_updated_at`, GRANTs, RLS:

- **event_hotsite_settings** (1:1 com event, unique `event_id`): `hero_title, hero_subtitle, cta_primary_label, cta_primary_url, cta_secondary_label, cta_secondary_url, show_countdown, show_lineup, show_tickets, show_experiences, show_sponsors, show_news, show_info, show_banners, info_address, info_gates_open_at, info_age_rating, info_parking, info_map_url, info_rules, info_faq(jsonb)`.
- **event_sponsors**: `name, category (enum: master, sponsor, supporter, partner, realization, production, media), logo_url, website_url, sort_order, is_active`.
- **event_banners**: `title, image_url, link_url, placement (enum: below_hero, between_lineup_tickets, before_experiences, before_footer), sort_order, is_active`.
- **event_news**: `title, slug, excerpt, content, image_url, status (draft|published), published_at, is_featured, sort_order`. Unique `(event_id, slug)`.

RLS por tabela:

- SELECT público: apenas quando o `events` pai está `status='published'` E o registro está `is_active`/`status='published'`.
- SELECT membros ativos da org: sempre.
- INSERT/UPDATE: manager+.
- DELETE: admin+.

GRANTs: `SELECT` a `anon` + `authenticated`; `INSERT/UPDATE/DELETE` a `authenticated`; `ALL` a `service_role`.

RPCs públicas SECURITY DEFINER (evita cadeia de policies pesada no PostgREST):

- `get_event_hotsite_by_slug(_slug)` → retorna settings + info do evento.
- `list_event_sponsors_by_slug(_slug)` → ativos, ordenados.
- `list_event_banners_by_slug(_slug, _placement)` → ativos por posição.
- `list_event_news_by_slug(_slug, _limit)` → publicados por data desc.
- `get_event_news_by_slugs(_event_slug, _news_slug)` → notícia individual (publicada + evento publicado).

### 3. Admin — Aba "Hotsite"

Nova rota: `src/routes/_authenticated/admin.eventos.$id.hotsite.tsx`.

Registrar no menu de operações do evento. Layout mobile-first com Accordion (Radix já disponível):

- **Hero & Contador** — form dos campos `hero_*`, CTAs, `show_countdown`.
- **Blocos ativos** — switches (`show_lineup/tickets/experiences/sponsors/news/info/banners`).
- **Programação** — link para `admin.eventos.$id.lineup` (já existe).
- **Ingressos** — link para editar `external_ticket_url` (já existe em `editar`).
- **Experiências** — link para `admin.eventos.$id.espacos` (já existe).
- **Patrocinadores** — CRUD inline com upload de logo (bucket `event-covers`).
- **Banners** — CRUD inline com upload + select de placement.
- **Notícias** — lista + formulário (título/slug/excerpt/content textarea/imagem/status/destaque).
- **Informações úteis** — form com endereço, portões, classificação, estacionamento, mapa, regras, FAQ.
- **Prévia** — botão "Visualizar hotsite" abrindo `/eventos/:slug` em nova aba.

Server functions em `src/lib/hotsite.functions.ts` com `requireSupabaseAuth`:

- `getHotsiteSettings`, `upsertHotsiteSettings`.
- `listSponsors`, `createSponsor`, `updateSponsor`, `deleteSponsor`.
- `listBanners`, `createBanner`, `updateBanner`, `deleteBanner`.
- `listNews`, `createNews`, `updateNews`, `deleteNews`.

### 4. Página pública data-driven

Refatorar `src/routes/_site.eventos.$slug.tsx` para renderização por blocos condicionais (`show_*`):

```
Hero (+ countdown se show_countdown)
BannerSlot placement=below_hero
Line-up (se show_lineup && attractions.length)
Ingressos externos (se show_tickets && external_ticket_url)
BannerSlot placement=between_lineup_tickets
Experiências (se show_experiences && space_types.length)
BannerSlot placement=before_experiences
Patrocinadores (se show_sponsors && sponsors.length, agrupados por categoria)
Notícias (se show_news, últimas 6)
Informações úteis (se show_info)
BannerSlot placement=before_footer
```

Nova rota pública para notícia individual: `src/routes/_site.eventos.$slug.noticias.$newsSlug.tsx`.

Loader busca settings + sponsors + banners + news em paralelo via `queryClient.ensureQueryData` (mesmo padrão atual do slug page).

Countdown como client-only component (`useState/useEffect`) para evitar mismatch SSR.

### 5. Não faz parte

- Galeria de imagens/vídeos: apenas registrar no relatório como lacuna futura.
- Sort_order drag-and-drop: usar input numérico simples.
- Editor rich-text para notícias: usar textarea + markdown básico (renderização simples).
- Prévia de rascunho autenticada: se evento não `published`, RPC retorna vazio; admin vê aviso "publique o evento para visualizar o hotsite".

### 6. Validação

- `bunx tsgo --noEmit`
- `bun run build`
- Mobile 360/390/430; desktop.

### 7. Riscos previstos

- Volume de novas RLS/RPC — mitigo com padrão idêntico ao já existente (`list_published_events`, `list_event_attractions_by_slug`).
- Storage: reusar bucket `event-covers` sob mesmo prefixo `<org_id>/hotsite/...` para não precisar criar bucket novo nem policy nova.
- Slug de notícia: unique por evento; validação Zod.

### Ordem de execução

1. Migração única (tabelas + RLS + RPCs + policies storage se necessário).
2. Server functions autenticadas.
3. Rota admin com todos os accordions + uploads.
4. Refactor página pública + rota de notícia.
5. Registrar no menu de operações.
6. Typecheck + build + relatório final.

Complemento obrigatório antes de iniciar:

Também deixar a fundação preparada para tracking do hotsite:

- preservar ?promoter= e UTMs na sessão;

- registrar clique em links externos quando possível;

- garantir que reservas originadas pelo hotsite recebam promoter/UTM/source;

- não expor dados pessoais publicamente;

- anon só pode inserir via RPC validada;

- não criar venda direta/PIX nesta fase, apenas preparar arquitetura e relatar lacunas.

No relatório final, incluir:

- como o hotsite preserva promoter/UTM;

- o que já está pronto para venda externa rastreável;

- o que fica pendente para venda direta futura de camarote/bistrô/mesa com QR.

&nbsp;

O planejamento da Fase 8.3 está aprovado como base, mas antes de executar incorpore obrigatoriamente ao planejamento a camada comercial e de tracking abaixo.

&nbsp;

Não remover nem substituir o planejamento atual. Este bloco é complementar.

&nbsp;

FASE 8.3 — COMPLEMENTO OBRIGATÓRIO

TRACKING COMERCIAL, PROMOTERS, MAPA DE ESPAÇOS, LEADS E SEGURANÇA

&nbsp;

1. TRACKING DE PROMOTER E CAMPANHAS

&nbsp;

O hotsite precisa nascer preparado para preservar atribuição de origem.

&nbsp;

Suportar:

- ?promoter=CODIGO

- utm_source

- utm_medium

- utm_campaign

- utm_content

- utm_term

&nbsp;

Auditar primeiro o sistema existente de:

- promoters;

- leads;

- track_public_lead;

- query string de promoter;

- reservas;

- Access Engine.

&nbsp;

Não recriar estruturas que já existam.

&nbsp;

A origem deve ser preservada durante a navegação do visitante no hotsite e vinculada, quando aplicável, a:

&nbsp;

- lead;

- clique em ingresso;

- solicitação de mesa;

- solicitação de bistrô;

- solicitação de camarote;

- formulário de interesse;

- futura conversão.

&nbsp;

Não confiar em promoter_id enviado diretamente pelo frontend público.

&nbsp;

O frontend envia apenas código público do promoter e parâmetros permitidos.

A resolução do promoter deve ocorrer de forma segura no backend/RPC.

&nbsp;

2. TRACKING DE CLIQUES EM VENDAS EXTERNAS

&nbsp;

O planejamento atual prevê apenas `events.external_ticket_url`.

&nbsp;

Isso é insuficiente para eventos de vários dias.

&nbsp;

Auditar e, se não houver estrutura equivalente, criar uma estrutura mínima para links comerciais externos por evento.

&nbsp;

Sugestão:

&nbsp;

event_commercial_links

- id

- organization_id

- event_id

- label

- date opcional

- link_type

- destination_url

- sort_order

- is_active

- tracking_enabled

- created_at

- updated_at

&nbsp;

Tipos possíveis:

- ticket

- passport

- sector

- external_space

- other

&nbsp;

O hotsite deve permitir, por exemplo:

&nbsp;

10 SET — Comprar ingresso

11 SET — Comprar ingresso

12 SET — Comprar ingresso

13 SET — Comprar ingresso

14 SET — Comprar ingresso

PASSAPORTE — Comprar passaporte

&nbsp;

Ao clicar:

1. registrar evento de clique de forma segura;

2. associar origem/promoter/UTMs quando existentes;

3. redirecionar para a URL externa.

&nbsp;

Não expor URL administrativa ou dados internos desnecessários.

&nbsp;

Não criar checkout próprio nesta fase.

&nbsp;

3. ARQUITETURA PREPARADA PARA PIXEL E CONVERSÃO

&nbsp;

Preparar a arquitetura para futura mensuração de:

&nbsp;

- visualização do hotsite;

- clique em CTA;

- clique em ingresso;

- lead iniciado;

- lead concluído;

- reserva solicitada;

- reserva confirmada;

- futura compra confirmada.

&nbsp;

Não implementar integrações arbitrárias com pixels de terceiros sem configuração e consentimento adequados.

&nbsp;

A estrutura deve permitir futuramente configurar eventos de conversão e integrações autorizadas sem reescrever o hotsite.

&nbsp;

No relatório, explicar claramente:

- o que foi implementado;

- o que está apenas preparado;

- quais eventos comerciais podem ser medidos.

&nbsp;

4. MAPA COMERCIAL DE MESAS, BISTRÔS E CAMAROTES

&nbsp;

O hotsite precisa ser preparado para exibir mapa comercial do evento.

&nbsp;

Reutilizar:

- reservable_space_types;

- reservable_spaces;

- space_reservation_requests.

&nbsp;

Auditar os campos existentes antes de criar novos.

&nbsp;

Se necessário, adicionar suporte mínimo para:

&nbsp;

- imagem do mapa/planta do evento;

- código identificador do espaço;

- setor;

- posição X;

- posição Y;

- largura opcional;

- altura opcional;

- rotação opcional;

- status comercial;

- capacidade;

- preço;

- observação.

&nbsp;

Objetivo público:

&nbsp;

visitante abre o hotsite

→ acessa “Mapa e espaços”

→ visualiza a planta

→ identifica mesas, bistrôs e camarotes

→ toca no espaço desejado

→ visualiza detalhes

→ informa os dados mínimos necessários

→ sistema gera lead

→ sistema cria solicitação de reserva

→ origem/promoter/UTM é preservada

→ admin recebe a solicitação.

&nbsp;

No mobile:

- mapa deve permitir zoom/pan de forma controlada;

- não causar overflow horizontal da página;

- alternativa por lista deve existir;

- selecionar no mapa deve destacar o item correspondente na lista;

- selecionar na lista deve destacar o espaço no mapa.

&nbsp;

Não criar editor drag-and-drop complexo nesta fase.

&nbsp;

O admin pode inicialmente configurar posições numericamente ou por mecanismo simples, desde que a arquitetura permita evolução futura.

&nbsp;

5. RESERVA DIRETA PELO HOTSITE

&nbsp;

Diferenciar claramente:

&nbsp;

A) ingresso geral externo;

B) solicitação/reserva interna de espaço;

C) futura venda direta com pagamento.

&nbsp;

Nesta fase, o fluxo interno deve usar a infraestrutura existente.

&nbsp;

Fluxo:

&nbsp;

hotsite

→ escolha do espaço

→ formulário mínimo

→ lead

→ solicitação de reserva

→ painel administrativo

→ análise/confirmação

→ somente depois, quando as regras permitirem, credencial de acesso.

&nbsp;

Não chamar lead de venda.

Não chamar reserva pendente de compra confirmada.

Não gerar QR para solicitação pendente.

&nbsp;

6. QR CODE E ACCESS ENGINE

&nbsp;

Auditar o sistema já existente antes de alterar qualquer coisa.

&nbsp;

O objetivo arquitetural é:

&nbsp;

reserva confirmada

→ credencial válida

→ token/QR

→ Access Engine

→ validação

→ proteção contra dupla entrada

→ registro de acesso.

&nbsp;

Nesta fase:

- reutilizar estruturas existentes;

- não duplicar sistema de QR;

- não criar segundo validador;

- não emitir QR para lead;

- não emitir QR para reserva pendente;

- não acoplar reserva ao Access Engine sem regra de autorização clara.

&nbsp;

Se a integração segura já for suportada pela arquitetura existente, documentar como será reutilizada.

&nbsp;

Se não estiver pronta, registrar exatamente a lacuna sem improvisar.

&nbsp;

7. PAINEL ADMINISTRATIVO COMERCIAL

&nbsp;

Dentro do gerenciamento do evento, além da aba Hotsite, preparar visualização operacional para:

&nbsp;

- visualizações do hotsite;

- cliques em CTAs;

- cliques em ingressos;

- leads;

- leads por origem;

- leads por promoter;

- solicitações de reserva;

- reservas por status;

- espaços disponíveis;

- espaços solicitados;

- espaços confirmados.

&nbsp;

Não precisa criar dashboard analítico complexo nesta fase.

&nbsp;

Pode começar com:

- cards de resumo;

- filtros;

- tabelas;

- indicadores simples.

&nbsp;

Não expor dados pessoais em telas onde não sejam necessários.

&nbsp;

8. SEGURANÇA OBRIGATÓRIA

&nbsp;

Essa parte é crítica.

&nbsp;

O sistema começará a lidar com:

- nome;

- telefone;

- e-mail;

- origem de campanha;

- promoter;

- intenção comercial;

- reserva;

- observações do cliente.

&nbsp;

Aplicar princípio de menor privilégio.

&nbsp;

Regras mínimas:

&nbsp;

- anon nunca consulta leads;

- anon nunca consulta reservas;

- anon nunca consulta dados pessoais;

- anon não faz INSERT direto em tabelas sensíveis;

- submissões públicas passam por RPC validada;

- validar tamanho máximo de todos os campos;

- normalizar telefone/e-mail quando aplicável;

- rejeitar payload inesperado;

- impedir HTML/script em campos públicos;

- não confiar em preço enviado pelo frontend;

- não confiar em status enviado pelo frontend;

- não confiar em organization_id enviado pelo frontend;

- não confiar em event_id arbitrário do frontend quando a operação puder resolver pelo slug;

- não confiar em promoter_id vindo do frontend;

- usar RLS deny-by-default;

- manager+ acessa dados operacionais do evento conforme organização;

- promoter não recebe acesso amplo a dados pessoais;

- registrar alterações críticas de status quando a estrutura de auditoria existente permitir;

- evitar dados pessoais em logs técnicos;

- evitar metadata excessiva.

&nbsp;

Auditar SECURITY DEFINER:

- usar SET search_path seguro;

- schema qualification;

- validação explícita;

- menor superfície de EXECUTE possível.

&nbsp;

9. RATE LIMIT E ABUSO

&nbsp;

Como haverá formulários públicos e tracking, preparar proteção contra abuso.

&nbsp;

Auditar mecanismos existentes.

&nbsp;

Aplicar, quando compatível com a arquitetura atual:

- deduplicação;

- limite lógico por janela;

- idempotência para submissões críticas;

- proteção contra clique duplicado excessivo;

- proteção contra criação repetitiva de reservas;

- validação server-side.

&nbsp;

Não confiar apenas em botão desabilitado no frontend.

&nbsp;

10. LGPD E CONSENTIMENTO

&nbsp;

Nos formulários públicos que coletarem contato, exibir texto curto e claro:

&nbsp;

“Ao enviar, você autoriza o contato da organização sobre este evento.”

&nbsp;

Registrar, quando aplicável:

- consent_accepted;

- consent_at;

- source_page;

- finalidade mínima.

&nbsp;

Não coletar dados além do necessário.

&nbsp;

Não criar checkbox ou coleta adicional sem necessidade.

&nbsp;

11. RELAÇÃO COM O CONSTRUTOR DE HOTSITE

&nbsp;

O construtor continua data-driven.

&nbsp;

A aba Hotsite deve ganhar também acessos claros para:

&nbsp;

- Links comerciais

- Tracking

- Mapa e espaços

- Leads

- Reservas

&nbsp;

Não colocar tudo em uma única página gigante.

&nbsp;

Manter a arquitetura mobile-first com navegação operacional clara.

&nbsp;

12. NÃO IMPLEMENTAR NESTA FASE

&nbsp;

Não criar:

- checkout completo;

- gateway de pagamento;

- split financeiro;

- marketplace;

- venda geral própria de ingressos;

- PIX sem fluxo financeiro validado;

- emissão automática indiscriminada de QR;

- editor visual complexo de mapa;

- pixel de terceiros arbitrário;

- exposição de dados pessoais para promoters.

&nbsp;

13. ENTREGA FINAL OBRIGATÓRIA

&nbsp;

Além do relatório já planejado, informar:

&nbsp;

1. como promoter é preservado;

2. como UTMs são preservadas;

3. como cliques externos são registrados;

4. estrutura de links por dia/passaporte;

5. como leads são atribuídos;

6. como reservas preservam origem;

7. como funciona o mapa comercial;

8. relação entre lead, reserva e QR;

9. o que já está integrado ao Access Engine;

10. o que ficou apenas preparado para venda direta futura;

11. medidas de segurança aplicadas;

12. políticas RLS criadas/alteradas;

13. RPCs públicas criadas/alteradas;

14. grants de anon/authenticated revisados;

15. riscos residuais reais;

16. testes mobile 360/390/412/430;

17. typecheck;

18. build.

&nbsp;

Depois de incorporar este complemento ao planejamento, pode prosseguir com a Fase 8.3 em sequência controlada.

&nbsp;

&nbsp;