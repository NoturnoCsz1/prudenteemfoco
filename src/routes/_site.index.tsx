import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Sparkles, ShieldCheck, Layers } from "lucide-react";

export const Route = createFileRoute("/_site/")({
  component: HomePage,
});

function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="container-page py-20 md:py-32">
          <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">
            Uma nova fase
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] text-foreground md:text-6xl">
            Eventos, experiências e operação profissional{" "}
            <span className="text-primary">com identidade própria.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            A Prudente em Foco inicia uma nova plataforma institucional para
            produzir, promover e operar seus próprios eventos — com tecnologia,
            memória e senso de futuro.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/eventos"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Conhecer eventos <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contato"
              className="inline-flex items-center rounded-md border border-border-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Fale com a produção
            </Link>
          </div>
        </div>
      </section>

      {/* EVENTOS E EXPERIÊNCIAS */}
      <section className="border-t border-border">
        <div className="container-page py-20">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Eventos e experiências
              </p>
              <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
                Duas frentes complementares.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Nossa plataforma será organizada em torno de dois pilares:
                eventos institucionais e experiências curadas. Abaixo,
                exemplos conceituais da estrutura visual — o conteúdo real
                será publicado em fases seguintes.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <PreviewCard
              icon={<CalendarDays className="h-5 w-5" />}
              label="Estrutura — Eventos"
              title="Produção e realização"
              description="Espaço destinado a eventos próprios organizados pela Prudente em Foco: identidade, agenda, operação e público."
            />
            <PreviewCard
              icon={<Sparkles className="h-5 w-5" />}
              label="Estrutura — Experiências"
              title="Curadoria e encontros"
              description="Formatos curados que ampliam a relação da marca com seu público, para além do calendário tradicional de eventos."
            />
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Cards demonstrativos. Nenhum evento real listado — o catálogo
            oficial será publicado quando cada fase for validada.
          </p>
        </div>
      </section>

      {/* OPERAÇÃO */}
      <section className="border-t border-border bg-surface/40">
        <div className="container-page py-20">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Operação profissional
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Organização, cuidado e método.
            </h2>
            <p className="mt-4 text-muted-foreground">
              A nova plataforma está sendo construída com foco em segurança,
              organização e experiência real do público. Cada módulo será
              habilitado quando estiver pronto para produção.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <ValueBlock
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Segurança primeiro"
              text="Fundação técnica pensada para proteger dados, operações e público desde o primeiro dia."
            />
            <ValueBlock
              icon={<Layers className="h-5 w-5" />}
              title="Modular e progressivo"
              text="Cada domínio evolui em sua fase própria, sem inflar a plataforma com módulos prematuros."
            />
            <ValueBlock
              icon={<Sparkles className="h-5 w-5" />}
              title="Feito para o público"
              text="Interface mobile-first, leve e clara — construída para quem realmente vive os eventos."
            />
          </div>
        </div>
      </section>

      {/* MEMÓRIA E FUTURO */}
      <section className="border-t border-border">
        <div className="container-page py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
                Memória e futuro
              </p>
              <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
                Preservar a trajetória.
                <br />
                Construir a próxima fase.
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                A Prudente em Foco carrega uma história construída ao longo de
                anos junto ao seu público. Esta plataforma nasce para preservar
                essa memória e abrir espaço para uma nova geração de eventos e
                experiências.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Uma linha do tempo institucional será publicada em fase própria,
                após validação de conteúdo.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-border-strong bg-surface p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
                style={{ background: "var(--primary)" }}
              />
              <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">
                Fase 0
              </p>
              <p className="mt-3 text-xl font-semibold leading-snug text-foreground">
                Fundação limpa, segura e modular. A partir daqui, cada fase
                traz um novo domínio validado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTATO */}
      <section className="border-t border-border">
        <div className="container-page py-20 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold md:text-4xl">
            Vamos conversar sobre a nova fase.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Para parcerias, produção, curadoria ou imprensa, entre em contato
            com a equipe institucional.
          </p>
          <div className="mt-8">
            <Link
              to="/contato"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Ir para contato <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* AVISO DE EVOLUÇÃO */}
      <section className="border-t border-border">
        <div className="container-page py-10">
          <div className="rounded-lg border border-border bg-surface/60 px-5 py-4 text-center text-xs text-muted-foreground">
            Plataforma em evolução — a Prudente em Foco está sendo construída
            progressivamente. Novas seções serão publicadas em fases seguintes.
          </div>
        </div>
      </section>
    </>
  );
}

function PreviewCard({
  icon,
  label,
  title,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-strong">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
      </div>
      <h3 className="mt-4 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </article>
  );
}

function ValueBlock({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-6">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
