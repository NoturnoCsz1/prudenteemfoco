import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";

export const Route = createFileRoute("/_site/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Prudente em Foco" },
      {
        name: "description",
        content:
          "Fale com a equipe institucional da Prudente em Foco: parcerias, produção, curadoria e imprensa.",
      },
      { property: "og:title", content: "Contato — Prudente em Foco" },
      {
        property: "og:description",
        content: "Fale com a equipe institucional da Prudente em Foco.",
      },
    ],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  return (
    <>
      <PageHero
        eyebrow="Contato"
        title="Fale com a equipe institucional."
        description="Canais para parcerias, produção, curadoria e imprensa. O formulário oficial será habilitado em fase própria — nesta etapa, a comunicação é direta."
      />
      <section className="container-page pb-24">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-xl font-semibold">Contato institucional</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Envie sua mensagem para o e-mail oficial da Prudente em Foco.
            Responderemos por ordem de chegada.
          </p>
          <a
            href="mailto:contato@prudenteemfoco.com.br"
            className="mt-6 inline-flex items-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            contato@prudenteemfoco.com.br
          </a>
          <p className="mt-6 text-xs text-muted-foreground">
            Formulário e canais adicionais serão habilitados em fase própria.
          </p>
        </div>
      </section>
    </>
  );
}
