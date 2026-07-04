import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Admin — Configurações · Prudente em Foco" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="p-5 md:p-8">
      <AdminPageHeader title="Configurações" description="Configurações institucionais e da plataforma." />
      <AdminPlaceholder
        title="Módulo em fase própria"
        description="Configurações administrativas — organização, permissões, integrações — serão habilitadas quando os domínios correspondentes forem desenvolvidos."
      />
    </div>
  ),
});
