import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { EmptyState } from "@/components/site/EmptyState";

export const Route = createFileRoute("/_site/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos — Prudente em Foco" },
      {
        name: "description",
        content:
          "Espaço institucional dos eventos próprios da Prudente em Foco. Agenda oficial em construção.",
      },
      { property: "og:title", content: "Eventos — Prudente em Foco" },
      {
        property: "og:description",
        content: "Agenda oficial dos eventos da Prudente em Foco em construção.",
      },
    ],
  }),
  component: EventosPage,
});

function EventosPage() {
  return (
    <>
      <PageHero
        eyebrow="Eventos"
        title="Nossa agenda oficial está sendo construída."
        description="Nesta fase inicial, apresentamos apenas a estrutura institucional. O catálogo real de eventos será publicado em fase própria, com todas as informações verificadas."
      />
      <section className="container-page pb-20">
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="Nenhum evento publicado ainda"
          description="Ao invés de listar eventos genéricos, preferimos publicar apenas o que é oficial. Volte em breve — a agenda começará a ser divulgada na próxima fase."
        />
      </section>
    </>
  );
}
