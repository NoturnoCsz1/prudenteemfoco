import { useState, type ReactNode } from "react";
import { Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrgMembership } from "@/hooks/use-org-membership";
import { useSession } from "@/hooks/use-session";

const MAIN_ORG_SLUG = "prudente-em-foco";

/**
 * Portão de autorização do admin.
 * Requer sessão + membership ativa. Se não houver, mostra tela
 * "Acesso em análise" com botão discreto para reivindicar owner
 * (funciona apenas se a organização ainda não tiver owner).
 */
export function OrgGate({ children }: { children: ReactNode }) {
  const { user, loading: sessionLoading } = useSession();
  const { data: membership, isLoading, refetch } = useOrgMembership();
  const [claiming, setClaiming] = useState(false);

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

  async function handleClaim() {
    if (claiming) return;
    setClaiming(true);
    try {
      const { error } = await supabase.rpc("claim_first_owner", {
        _org_slug: MAIN_ORG_SLUG,
      });
      if (error) throw error;
      toast.success("Você agora é proprietário da organização.");
      await refetch();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível reivindicar.";
      toast.error(message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 md:p-8 text-center">
        <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <h1 className="mt-4 font-display text-xl font-semibold">
          Acesso em análise
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sua conta foi autenticada, mas ainda não está vinculada a uma
          organização ativa. Peça a um proprietário para incluir seu e-mail
          como membro. Assim que a permissão for concedida, o painel será
          liberado automaticamente.
        </p>
        {user?.email && (
          <p className="mt-3 text-xs text-muted-foreground/80">
            Sessão: <span className="text-foreground">{user.email}</span>
          </p>
        )}

        <div className="mt-6 border-t border-border pt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Primeira instalação
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Se você é o responsável técnico e a organização ainda não tem
            proprietário, é possível reivindicar o papel de owner uma única
            vez. Depois de reivindicado, esta ação nunca mais funciona.
          </p>
          <button
            type="button"
            onClick={handleClaim}
            disabled={claiming}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-border-strong bg-transparent px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            {claiming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Reivindicar owner (Prudente em Foco)
          </button>
        </div>
      </div>
    </div>
  );
}
