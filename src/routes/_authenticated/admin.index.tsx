import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminPlaceholder } from "@/components/admin/AdminPage";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — Visão Geral · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const { user } = useSession();
  const label = user?.email ?? "usuário autenticado";

  return (
    <div className="p-5 md:p-8">
      <AdminPageHeader
        title="Visão Geral"
        description={`Sessão ativa: ${label}. Nenhum módulo operacional foi habilitado nesta fase.`}
      />
      <AdminPlaceholder
        title="Fundação de autenticação ativa"
        description="A área administrativa está protegida por login. Papéis, organizações, eventos e trilha de auditoria já existem no banco com regras de acesso mínimas. Os módulos operacionais serão habilitados nas próximas fases."
      />
    </div>
  );
}
