import { type ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useOrgMembership } from "@/hooks/use-org-membership";
import { useSession } from "@/hooks/use-session";

/**
 * Portão de autorização do admin.
 * Requer sessão + membership ativa. Sem vínculo → tela "Acesso não autorizado".
 * OWNER só é atribuído manualmente via banco/setup inicial — sem auto-claim.
 */
export function OrgGate({ children }: { children: ReactNode }) {
  const { user, loading: sessionLoading } = useSession();
  const { data: membership, isLoading } = useOrgMembership();

  if (sessionLoading || (user && isLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (membership) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 md:p-8 text-center">
        <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <h1 className="mt-4 font-display text-xl font-semibold">
          Acesso não autorizado
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sua conta não está vinculada a uma organização ativa. Contate o
          administrador para receber acesso.
        </p>
        {user?.email && (
          <p className="mt-3 text-xs text-muted-foreground/80">
            Sessão: <span className="text-foreground">{user.email}</span>
          </p>
        )}
      </div>
    </div>
  );
}
