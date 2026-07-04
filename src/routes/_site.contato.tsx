import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Prudente em Foco" },
      {
        name: "description",
        content:
          "Fale com a Prudente em Foco. Canal direto para público, imprensa, parcerias e produção.",
      },
      { property: "og:title", content: "Contato — Prudente em Foco" },
      {
        property: "og:description",
        content: "Fale com a Prudente em Foco.",
      },
    ],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  return (
    <>
      <section className="container-page pt-20 pb-8 md:pt-32 md:pb-16">
        <p className="eyebrow-label text-primary">Contato</p>
        <h1 className="poster mt-5 text-[clamp(2.8rem,13vw,9rem)] leading-[0.88] text-foreground md:mt-6">
          FALE
          <br />
          COM A
          <br />
          <span className="text-primary">GENTE.</span>
        </h1>
        <p className="mt-6 max-w-xl font-display text-base leading-snug text-foreground/85 md:mt-8 md:text-2xl">
          Público, imprensa, parcerias ou produção — respondemos por ordem de
          chegada no canal oficial abaixo.
        </p>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-12 md:py-24">
        <div className="grid gap-6 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-4">
            <p className="eyebrow-label text-muted-foreground">Canal oficial</p>
          </div>
          <div className="md:col-span-8">
            <a
              href="mailto:contato@prudenteemfoco.com.br"
              className="block break-words font-display text-[clamp(1.05rem,4.8vw,2.4rem)] font-semibold leading-tight text-foreground transition-colors hover:text-primary"
            >
              contato@prudenteemfoco.com.br
            </a>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground md:mt-6">
              Envie sua mensagem descrevendo o assunto. Se for imprensa,
              indique veículo e prazo. Se for parceria ou produção,
              descreva o evento e a data.
            </p>
          </div>
        </div>
      </section>

    </>
  );
}
