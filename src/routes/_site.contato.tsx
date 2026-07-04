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
      <section className="container-page pt-16 pb-8 md:pt-28 md:pb-16">
        <p className="eyebrow-label text-primary">Contato</p>
        <h1 className="poster mt-6 text-[clamp(3.5rem,14vw,9rem)] leading-[0.86] text-foreground">
          FALE
          <br />
          COM A
          <br />
          <span className="text-primary">GENTE.</span>
        </h1>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Para público, imprensa, parcerias ou produção — escreva no canal
          oficial abaixo. Respondemos por ordem de chegada.
        </p>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow-label text-muted-foreground">Canal oficial</p>
          </div>
          <div className="md:col-span-8">
            <a
              href="mailto:contato@prudenteemfoco.com.br"
              className="poster block text-[clamp(1.6rem,5vw,3rem)] leading-tight text-foreground transition-colors hover:text-primary"
            >
              contato@prudenteemfoco.com.br
            </a>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
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
