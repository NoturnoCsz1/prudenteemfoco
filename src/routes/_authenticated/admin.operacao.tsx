import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/admin/operacao")({
  head: () => ({ meta: [{ title: "Admin — Operação · Prudente em Foco" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="p-5 md:p-8">
      <AdminPageHeader title="Operação" description="Operação futura de eventos e experiências." />
      <AdminPlaceholder
        title="Módulo em fase própria"
        description="Fluxos operacionais — credenciamento, acesso, público — serão desenvolvidos em fase dedicada, com validação server-side e auditoria."
      />
    </div>
  ),
});
