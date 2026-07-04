import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_site/experiencias")({
  head: () => ({
    meta: [
      { title: "Experiências — Prudente em Foco" },
      {
        name: "description",
        content:
          "Camarotes, bistrôs, mesas e áreas especiais nos eventos da Prudente em Foco.",
      },
      { property: "og:title", content: "Experiências — Prudente em Foco" },
      {
        property: "og:description",
        content: "Camarotes, bistrôs e áreas especiais nos eventos.",
      },
    ],
  }),
  component: ExperienciasPage,
});

const PILLARS = [
  {
    label: "Camarotes",
    body: "Vista privilegiada, atendimento próprio e ritmo mais reservado dentro do evento.",
  },
  {
    label: "Bistrôs",
    body: "Ambientes intimistas para receber convidados sem abrir mão da programação principal.",
  },
  {
    label: "Mesas & áreas especiais",
    body: "Espaços dedicados para grupos, com acesso facilitado e experiência curada.",
  },
] as const;

function ExperienciasPage() {
  return (
    <>
      <section className="container-page pt-20 pb-8 md:pt-32 md:pb-16">
        <p className="eyebrow-label text-primary">Experiências</p>
        <h1 className="poster mt-5 text-[clamp(2.8rem,12vw,8rem)] leading-[0.88] text-foreground md:mt-6">
          ALÉM
          <br />
          DO PALCO.
        </h1>
        <p className="mt-6 max-w-xl font-display text-base leading-snug text-foreground/85 md:mt-8 md:text-2xl">
          Formas curadas de viver os eventos da Prudente em Foco — antes,
          durante e depois do palco.
        </p>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-12 md:py-24">
        <div className="grid gap-8 md:grid-cols-3 md:gap-14">
          {PILLARS.map((p, i) => (
            <div key={p.label} className="flex flex-col gap-3">
              <span className="font-mono text-xs text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="font-display text-xl font-semibold leading-tight text-foreground md:text-3xl">
                {p.label}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-12 md:py-24">
        <div className="grid gap-6 md:grid-cols-12 md:items-end md:gap-12">
          <div className="md:col-span-8">
            <p className="eyebrow-label text-muted-foreground">Como reservar</p>
            <h2 className="mt-4 font-display text-xl font-semibold leading-tight text-foreground md:text-4xl">
              Cada evento tem sua própria página com espaços disponíveis e
              solicitação direta.
            </h2>
          </div>
          <div className="md:col-span-4">
            <Link
              to="/eventos"
              className="inline-flex items-center gap-2 border-b border-primary pb-1 font-display text-xs font-bold uppercase tracking-[0.3em] text-foreground hover:text-primary"
            >
              Ver agenda <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

    </>
  );
}
