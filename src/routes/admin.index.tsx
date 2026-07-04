import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — Visão Geral · Prudente em Foco" }, { name: "robots", content: "noindex" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  return (
    <div className="p-5 md:p-8">
      <AdminPageHeader
        title="Visão Geral"
        description="Shell administrativo da nova plataforma. Nenhum módulo operacional foi habilitado nesta fase."
      />
      <AdminPlaceholder
        title="Módulos serão habilitados por fase"
        description="Cada domínio — eventos, experiências, operação, configurações — será ativado quando estiver validado. Este shell existe apenas para preparar a navegação futura."
      />
    </div>
  );
}
