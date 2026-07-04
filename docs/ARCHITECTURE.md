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
    __root.tsx              # shell HTML, metadata, providers
    _site.tsx               # layout público (Header + Footer)
    _site.index.tsx         # /
    _site.eventos.tsx       # /eventos
    _site.experiencias.tsx  # /experiencias
    _site.sobre.tsx         # /sobre
    _site.contato.tsx       # /contato
    admin.tsx               # layout administrativo (sidebar/mobile nav)
    admin.index.tsx         # /admin
    admin.eventos.tsx       # /admin/eventos
    admin.experiencias.tsx  # /admin/experiencias
    admin.operacao.tsx      # /admin/operacao
    admin.configuracoes.tsx # /admin/configuracoes
  components/
    site/                   # componentes da experiência pública
    admin/                  # componentes do shell administrativo
  styles.css                # design system (tokens oklch)
```

Área pública e administrativa vivem em layouts distintos. Em fases
seguintes, a área administrativa passará por um portão de autenticação
(`_authenticated`) sem alterar as URLs `/admin/*`.

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
