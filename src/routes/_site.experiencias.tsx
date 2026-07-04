import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/experiencias")({
  head: () => ({
    meta: [
      { title: "Experiências — Prudente em Foco" },
      {
        name: "description",
        content:
          "Experiências que vão além do palco. Novos formatos curados pela Prudente em Foco.",
      },
      { property: "og:title", content: "Experiências — Prudente em Foco" },
      {
        property: "og:description",
        content: "Experiências que vão além do palco.",
      },
    ],
  }),
  component: ExperienciasPage,
});

function ExperienciasPage() {
  return (
    <>
      <section className="container-page pt-16 pb-8 md:pt-28 md:pb-16">
        <p className="eyebrow-label text-primary">Experiências</p>
        <h1 className="poster mt-6 text-[clamp(3rem,12vw,8rem)] leading-[0.86] text-foreground">
          EXPERIÊNCIAS
          <br />
          QUE VÃO ALÉM
          <br />
          <span className="text-primary">DO PALCO.</span>
        </h1>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Formatos curados para ampliar a forma de viver os eventos da Prudente em Foco —
          antes, durante e depois do palco.
        </p>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-20 md:py-32">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <p className="eyebrow-label text-muted-foreground">Em breve</p>
            <h2 className="poster mt-4 text-[clamp(2.2rem,7vw,4.5rem)] leading-[0.9] text-foreground">
              NOVAS EXPERIÊNCIAS
              <br />
              EM BREVE.
            </h2>
          </div>
          <div className="md:col-span-4">
            <p className="text-base leading-relaxed text-muted-foreground">
              Estamos preparando novas formas de viver os eventos da
              Prudente em Foco. Cada experiência será anunciada quando estiver
              pronta — sem promessas vazias.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
