import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import {
  CREDENTIAL_ROLE_LABEL,
  CREDENTIAL_STATUS_LABEL,
  type CredentialRoleType,
  type CredentialStatus,
} from "@/lib/access";
import type { Database } from "@/integrations/supabase/types";

type Credential = Database["public"]["Tables"]["event_credentials"]["Row"];

export const Route = createFileRoute(
  "/_authenticated/admin/eventos/$id/credenciais",
)({
  head: () => ({
    meta: [
      { title: "Credenciais — Admin · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CredentialsPage,
});

const STATUS_TONE: Record<CredentialStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30",
  inactive: "bg-muted text-muted-foreground ring-border",
};

function CredentialsPage() {
  const { id: eventId } = Route.useParams();
  const qc = useQueryClient();

  const eventQ = useQuery({
    queryKey: ["admin", "event", eventId, "meta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, organization_id")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const listQ = useQuery({
    queryKey: ["admin", "credentials", eventId],
    queryFn: async (): Promise<Credential[]> => {
      const { data, error } = await supabase
        .from("event_credentials")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function toggle(c: Credential) {
    const next: CredentialStatus =
      (c.status as CredentialStatus) === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("event_credentials")
      .update({ status: next })
      .eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (eventQ.data?.organization_id) {
      const { data: userRes } = await supabase.auth.getUser();
      if (userRes.user) {
        await supabase.rpc("record_audit_event", {
          _organization_id: eventQ.data.organization_id,
          _actor_user_id: userRes.user.id,
          _action: next === "active" ? "credential.activated" : "credential.deactivated",
          _entity_type: "event_credential",
          _entity_id: c.id,
          _metadata: {} as never,
        });
      }
    }
    toast.success(next === "active" ? "Credencial ativada." : "Credencial desativada.");
    qc.invalidateQueries({ queryKey: ["admin", "credentials", eventId] });
  }

  return (
    <div className="p-5 md:p-8">
      <OperationsNav
        eventId={eventId}
        active="credentials"
        eventTitle={eventQ.data?.title}
      />

      <p className="mt-4 text-sm text-muted-foreground">
        Credenciais operacionais do evento.
      </p>

      <div className="mt-6">
        {listQ.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !listQ.data || listQ.data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <ShieldCheck className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Nenhuma credencial cadastrada.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Titular</th>
                  <th className="px-3 py-2 text-left font-medium">Papel</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Documento</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listQ.data.map((c) => {
                  const st = c.status as CredentialStatus;
                  return (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{c.holder_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {CREDENTIAL_ROLE_LABEL[c.role_type as CredentialRoleType]}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_TONE[st]}`}
                        >
                          {CREDENTIAL_STATUS_LABEL[st]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {c.document_id || "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => toggle(c)}
                          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                        >
                          {st === "active" ? "Desativar" : "Ativar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
