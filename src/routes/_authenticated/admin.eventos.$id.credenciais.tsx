import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import { QrCodeModal } from "@/components/access/QrCodeModal";
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

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrCred, setQrCred] = useState<Credential | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [emitting, setEmitting] = useState<string | null>(null);

  async function emitQr(c: Credential) {
    setEmitting(c.id);
    try {
      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      }).rpc("create_access_token", {
        _event_id: eventId,
        _target_type: "event",
        _target_id: eventId,
        _subject_type: "credential",
        _subject_id: c.id,
        _capacity_limit: null,
        _label: `Credencial · ${c.holder_name}`,
      });
      if (error) throw error as Error;
      const row = (Array.isArray(data) ? data[0] : data) as { token_plain?: string } | null;
      if (!row?.token_plain) throw new Error("Falha ao gerar token");
      setQrToken(row.token_plain);
      setQrCred(c);
      setQrOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEmitting(null);
    }
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
                        <div className="flex justify-end gap-1">
                          {st === "active" ? (
                            <button
                              type="button"
                              onClick={() => emitQr(c)}
                              disabled={emitting === c.id}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                            >
                              {emitting === c.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <QrCode className="h-3 w-3" />
                              )}
                              Emitir QR
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => toggle(c)}
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                          >
                            {st === "active" ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QrCodeModal
        open={qrOpen}
        onOpenChange={(v) => {
          setQrOpen(v);
          if (!v) {
            setQrToken(null);
            setQrCred(null);
          }
        }}
        token={qrToken}
        title={qrCred ? `QR de credencial · ${qrCred.holder_name}` : "QR de credencial"}
        description="Uso ilimitado durante o evento. Guarde ou imprima agora — o token não voltará a ser exibido."
        meta={
          qrCred
            ? [
                { label: "Papel", value: CREDENTIAL_ROLE_LABEL[qrCred.role_type as CredentialRoleType] },
                { label: "Uso", value: "Ilimitado" },
              ]
            : undefined
        }
      />
    </div>
  );
}
