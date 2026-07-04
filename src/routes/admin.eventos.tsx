import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/admin/eventos")({
  head: () => ({ meta: [{ title: "Admin — Eventos · Prudente em Foco" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="p-5 md:p-8">
      <AdminPageHeader title="Eventos" description="Gestão futura de eventos institucionais." />
      <AdminPlaceholder
        title="Módulo em fase própria"
        description="A gestão real de eventos — criação, agenda, público e operação — será desenvolvida em fase dedicada."
      />
    </div>
  ),
});
