import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useSession } from "./use-session";

export type Membership = {
  organization_id: string;
  role: Database["public"]["Enums"]["member_role"];
  status: Database["public"]["Enums"]["member_status"];
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

/**
 * Retorna a membership ativa do usuário logado.
 *
 * Estados possíveis:
 * - loading: sessão ou consulta ainda em progresso.
 * - data === null: usuário logado, mas sem organização ativa.
 * - data !== null: usuário é membro ativo — libera admin shell.
 */
export function useOrgMembership() {
  const { user, loading: sessionLoading } = useSession();

  return useQuery({
    queryKey: ["org-membership", user?.id],
    enabled: !!user?.id && !sessionLoading,
    staleTime: 30_000,
    queryFn: async (): Promise<Membership | null> => {
      const { data: rows, error } = await supabase
        .from("organization_members")
        .select("organization_id, role, status")
        .eq("status", "active")
        .limit(1);

      if (error) {
        console.error("[useOrgMembership] members query", error);
        return null;
      }
      const row = rows?.[0];
      if (!row) return null;

      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("id", row.organization_id)
        .maybeSingle();

      if (orgErr) {
        console.error("[useOrgMembership] org query", orgErr);
      }

      return {
        organization_id: row.organization_id,
        role: row.role,
        status: row.status,
        organization: org ?? null,
      };
    },
  });
}
