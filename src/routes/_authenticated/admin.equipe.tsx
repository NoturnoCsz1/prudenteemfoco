import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgMembership } from "@/hooks/use-org-membership";
import type { Database } from "@/integrations/supabase/types";

type MemberRole = Database["public"]["Enums"]["member_role"];

const ASSIGNABLE_ROLES: MemberRole[] = [
  "admin",
  "manager",
  "promoter",
  "operator",
  "viewer",
];

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gerente",
  promoter: "Promoter",
  operator: "Operador",
  viewer: "Visualizador",
};

export const Route = createFileRoute("/_authenticated/admin/equipe")({
  head: () => ({ meta: [{ title: "Equipe — Prudente em Foco" }] }),
  component: TeamPage,
});

type MemberRow = {
  id: string;
  user_id: string;
  role: MemberRole;
  status: string;
  created_at: string;
  profile?: { email: string | null; display_name: string | null } | null;
};

function TeamPage() {
  const { data: membership, isLoading: membershipLoading } = useOrgMembership();
  const qc = useQueryClient();
  const orgId = membership?.organization_id;
  const isOwner = membership?.role === "owner";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("viewer");

  const { data: members, isLoading } = useQuery({
    queryKey: ["team-members", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, user_id, role, status, created_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as MemberRow[];
      const ids = rows.map((r) => r.user_id);
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, email, display_name")
          .in("user_id", ids);
        const byId = new Map((profs ?? []).map((p) => [p.user_id, p]));
        rows.forEach((r) => {
          const p = byId.get(r.user_id);
          r.profile = p ? { email: p.email, display_name: p.display_name } : null;
        });
      }
      return rows;
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("sem organização");
      const { error } = await supabase.rpc("invite_org_member", {
        _org_id: orgId,
        _email: email.trim(),
        _role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro adicionado.");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["team-members", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRole = useMutation({
    mutationFn: async (args: { id: string; role: MemberRole }) => {
      const { error } = await supabase.rpc("update_member_role", {
        _member_id: args.id,
        _role: args.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel atualizado.");
      qc.invalidateQueries({ queryKey: ["team-members", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("remove_org_member", { _member_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro removido.");
      qc.invalidateQueries({ queryKey: ["team-members", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (membershipLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <ShieldAlert className="mx-auto h-6 w-6 text-primary" />
          <h1 className="mt-3 font-display text-lg font-semibold">
            Somente o proprietário
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A gestão de equipe é exclusiva do proprietário da organização.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Equipe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Convide usuários registrados e defina o papel de cada um. O papel de
          proprietário não pode ser atribuído por aqui.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5 md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Adicionar membro
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim() || invite.isPending) return;
            invite.mutate();
          }}
          className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]"
        >
          <input
            type="email"
            required
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={invite.isPending || !email.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {invite.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Adicionar
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          O usuário precisa já ter uma conta criada na plataforma.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-surface">
        <div className="border-b border-border p-5 md:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Membros ativos
          </h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !members?.length ? (
          <div className="p-6 text-sm text-muted-foreground">
            Nenhum membro cadastrado.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between md:p-6"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {m.profile?.display_name ?? m.profile?.email ?? m.user_id}
                  </p>
                  {m.profile?.email && (
                    <p className="text-xs text-muted-foreground">
                      {m.profile.email}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {m.role === "owner" ? (
                    <span className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium">
                      {ROLE_LABEL.owner}
                    </span>
                  ) : (
                    <>
                      <select
                        value={m.role}
                        disabled={updateRole.isPending}
                        onChange={(e) =>
                          updateRole.mutate({
                            id: m.id,
                            role: e.target.value as MemberRole,
                          })
                        }
                        className="rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Remover este membro?")) remove.mutate(m.id);
                        }}
                        disabled={remove.isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-border-strong px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
