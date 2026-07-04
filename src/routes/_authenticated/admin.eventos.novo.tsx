import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { EventForm } from "@/components/admin/EventForm";

export const Route = createFileRoute("/_authenticated/admin/eventos/novo")({
  head: () => ({
    meta: [
      { title: "Novo evento — Admin · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewEventPage,
});

function NewEventPage() {
  return (
    <div className="p-5 md:p-8">
      <AdminPageHeader
        title="Novo evento"
        description="Preencha os campos essenciais. Você pode publicar depois."
      />
      <div className="mt-6 max-w-2xl">
        <EventForm mode="create" />
      </div>
    </div>
  );
}
