import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";

export const Route = createFileRoute("/_site/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Prudente em Foco" },
      {
        name: "description",
        content:
          "A Prudente em Foco é uma plataforma institucional própria de eventos, experiências e operação. Conheça a proposta desta nova fase.",
      },
      { property: "og:title", content: "Sobre — Prudente em Foco" },
      {
        property: "og:description",
        content: "Plataforma institucional própria de eventos e experiências.",
      },
    ],
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <>
      <PageHero
        eyebrow="Sobre"
        title="Uma plataforma institucional própria."
        description="A Prudente em Foco é dedicada à produção, promoção e operação dos seus próprios eventos e experiências, com identidade e método."
      />
      <section className="container-page pb-24">
        <div className="grid gap-10 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-xl font-semibold">Posicionamento</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A Prudente em Foco não é um guia genérico de bares e festas. É
              uma plataforma institucional própria, voltada aos eventos e
              experiências vinculados à marca — com autoridade, memória e
              tecnologia.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-xl font-semibold">Nova fase</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Esta plataforma marca o início de uma nova fase. Ela será
              construída em módulos, validada em etapas e ampliada apenas
              quando cada domínio estiver pronto para produção.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-xl font-semibold">Memória</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Uma linha do tempo institucional será publicada em fase própria,
              após validação de conteúdo. Não publicaremos afirmações
              históricas sem conteúdo verificado.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-xl font-semibold">Futuro</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Novos módulos — como operação, credenciamento, relacionamento
              com público e gestão de eventos — serão habilitados
              progressivamente, sempre com segurança e organização como
              prioridades.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
