import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { EmptyState } from "@/components/site/EmptyState";

export const Route = createFileRoute("/_site/experiencias")({
  head: () => ({
    meta: [
      { title: "Experiências — Prudente em Foco" },
      {
        name: "description",
        content:
          "Experiências curadas pela Prudente em Foco. Formatos que ampliam a relação da marca com seu público.",
      },
      { property: "og:title", content: "Experiências — Prudente em Foco" },
      {
        property: "og:description",
        content: "Formatos curados que ampliam a relação da marca com seu público.",
      },
    ],
  }),
  component: ExperienciasPage,
});

function ExperienciasPage() {
  return (
    <>
      <PageHero
        eyebrow="Experiências"
        title="Formatos curados, além do calendário."
        description="Experiências são encontros que vão além do formato tradicional de evento. Este espaço será dedicado à curadoria oficial da Prudente em Foco, publicada quando estiver pronta."
      />
      <section className="container-page pb-20">
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="Curadoria em preparação"
          description="Nenhuma experiência foi publicada ainda. Novos formatos serão anunciados quando cada um estiver validado."
        />
      </section>
    </>
  );
}
