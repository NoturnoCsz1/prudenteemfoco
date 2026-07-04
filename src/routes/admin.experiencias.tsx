import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/admin/experiencias")({
  head: () => ({ meta: [{ title: "Admin — Experiências · Prudente em Foco" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="p-5 md:p-8">
      <AdminPageHeader title="Experiências" description="Curadoria de experiências institucionais." />
      <AdminPlaceholder
        title="Módulo em fase própria"
        description="A gestão de experiências curadas será desenvolvida em fase dedicada."
      />
    </div>
  ),
});
