import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/sobre")({
  head: () => ({
    meta: [
      { title: "Nossa história — Prudente em Foco" },
      {
        name: "description",
        content:
          "Prudente em Foco: uma história no centro dos acontecimentos de Presidente Prudente. Eventos, cultura e memória.",
      },
      { property: "og:title", content: "Nossa história — Prudente em Foco" },
      {
        property: "og:description",
        content: "Uma história no centro dos acontecimentos.",
      },
    ],
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <>
      <section className="container-page pt-24 pb-10 md:pt-32 md:pb-16">
        <p className="eyebrow-label text-primary">Nossa história</p>
        <h1 className="poster mt-6 text-[clamp(3rem,12vw,8.5rem)] leading-[0.86] text-foreground">
          PRUDENTE
          <br />
          <span className="text-primary">EM FOCO.</span>
        </h1>
        <p className="mt-8 max-w-2xl font-display text-lg leading-snug text-foreground/85 md:text-2xl">
          Uma história no centro dos acontecimentos de Presidente Prudente —
          eventos, cultura e memória.
        </p>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-14 md:py-20">
        <div className="grid gap-8 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-4">
            <p className="eyebrow-label text-muted-foreground">Origem</p>
          </div>
          <div className="md:col-span-8">
            <p className="font-display text-xl leading-snug text-foreground md:text-3xl">
              Nascemos em Presidente Prudente, no interior de São Paulo,
              acompanhando de perto os eventos, a cultura e as pessoas que
              movimentam a cidade.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Ao longo dos anos, construímos uma relação direta com o público,
              com produtores e com quem faz cultura acontecer na região.
            </p>
          </div>
        </div>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-14 md:py-20">
        <div className="grid gap-8 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-4">
            <p className="eyebrow-label text-muted-foreground">Hoje</p>
          </div>
          <div className="md:col-span-8">
            <h2 className="poster text-[clamp(1.8rem,5vw,3.2rem)] leading-[0.95] text-foreground">
              EVENTOS QUE MARCAM.
              <br />
              <span className="text-primary">HISTÓRIAS QUE FICAM.</span>
            </h2>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Reunimos agenda, line-up e experiências dos grandes eventos da
              cidade em um só lugar. Cada informação aparece aqui quando pode
              ser publicada com verdade.
            </p>
          </div>
        </div>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-14 md:py-20">
        <div className="grid gap-8 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-4">
            <p className="eyebrow-label text-muted-foreground">Memória</p>
          </div>
          <div className="md:col-span-8">
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              A linha do tempo dos grandes eventos — edições, atrações e
              bastidores — será publicada conforme cada acervo for organizado.
              Aqui, cada história aparece quando pode ser contada com verdade.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
