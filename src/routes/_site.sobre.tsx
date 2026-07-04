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
      <section className="container-page pt-16 pb-8 md:pt-28 md:pb-16">
        <p className="eyebrow-label text-primary">Nossa história</p>
        <h1 className="poster mt-6 text-[clamp(3rem,12vw,8.5rem)] leading-[0.86] text-foreground">
          PRUDENTE
          <br />
          <span className="text-primary">EM FOCO.</span>
        </h1>
        <h2 className="poster mt-8 text-[clamp(1.8rem,6vw,3.5rem)] leading-[0.95] text-foreground/85">
          UMA HISTÓRIA
          <br />
          NO CENTRO
          <br />
          DOS ACONTECIMENTOS.
        </h2>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow-label text-muted-foreground">Origem</p>
          </div>
          <div className="md:col-span-8">
            <p className="poster text-[clamp(1.4rem,3.5vw,2.2rem)] leading-tight text-foreground">
              Nascemos em Presidente Prudente, no interior de São Paulo,
              acompanhando de perto os eventos, a cultura e as pessoas que
              movimentam a cidade.
            </p>
            <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground">
              Ao longo dos anos, construímos uma relação direta com o público,
              com produtores e com quem faz cultura acontecer na região.
            </p>
          </div>
        </div>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow-label text-muted-foreground">Nova fase</p>
          </div>
          <div className="md:col-span-8">
            <h3 className="poster text-[clamp(2rem,6vw,4rem)] leading-[0.9] text-foreground">
              UMA PLATAFORMA
              <br />
              PARA GRANDES
              <br />
              <span className="text-primary">EVENTOS.</span>
            </h3>
            <p className="mt-8 max-w-2xl leading-relaxed text-muted-foreground">
              Agora, a Prudente em Foco também é a plataforma oficial dos
              eventos que marcam a cidade — com agenda, line-up, reservas e
              memória em um único lugar.
            </p>
          </div>
        </div>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow-label text-muted-foreground">Memória</p>
          </div>
          <div className="md:col-span-8">
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              A linha do tempo dos grandes eventos da Prudente em Foco
              — edições, atrações e bastidores — será publicada conforme cada
              acervo for organizado. Aqui, cada história aparece quando pode
              ser contada com verdade.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
