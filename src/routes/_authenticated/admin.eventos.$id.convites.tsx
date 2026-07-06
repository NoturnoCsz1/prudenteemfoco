import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, QrCode, Ticket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import { QrCodeModal } from "@/components/access/QrCodeModal";
import {
  INVITE_STATUS_LABEL,
  INVITE_TYPE_LABEL,
  type InviteStatus,
  type InviteType,
} from "@/lib/access";
import type { Database } from "@/integrations/supabase/types";

type Invite = Database["public"]["Tables"]["event_invites"]["Row"];

export const Route = createFileRoute(
  "/_authenticated/admin/eventos/$id/convites",
)({
  head: () => ({
    meta: [
      { title: "Convites — Admin · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitesPage,
});

const STATUS_TONE: Record<InviteStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30",
  revoked: "bg-destructive/15 text-destructive ring-destructive/30",
  used: "bg-muted text-muted-foreground ring-border",
  expired: "bg-muted text-muted-foreground ring-border",
};

function InvitesPage() {
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

  const invitesQ = useQuery({
    queryKey: ["admin", "invites", eventId],
    queryFn: async (): Promise<Invite[]> => {
      const { data, error } = await supabase
        .from("event_invites")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function revoke(inv: Invite) {
    if (!confirm(`Revogar convite de ${inv.name}?`)) return;
    const { error } = await supabase
      .from("event_invites")
      .update({ status: "revoked" })
      .eq("id", inv.id);
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
          _action: "invite.revoked",
          _entity_type: "event_invite",
          _entity_id: inv.id,
          _metadata: {} as never,
        });
      }
    }
    toast.success("Convite revogado.");
    qc.invalidateQueries({ queryKey: ["admin", "invites", eventId] });
  }

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrInvite, setQrInvite] = useState<Invite | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [emitting, setEmitting] = useState<string | null>(null);

  async function emitQr(inv: Invite) {
    setEmitting(inv.id);
    try {
      const { data, error } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      }).rpc("create_access_token", {
        _event_id: eventId,
        _target_type: "event",
        _target_id: eventId,
        _subject_type: "invite",
        _subject_id: inv.id,
        _capacity_limit: 1,
        _label: `Convite · ${inv.name}`,
      });
      if (error) throw error as Error;
      const row = (Array.isArray(data) ? data[0] : data) as { token_plain?: string } | null;
      if (!row?.token_plain) throw new Error("Falha ao gerar token");
      setQrToken(row.token_plain);
      setQrInvite(inv);
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
        active="invites"
        eventTitle={eventQ.data?.title}
      />

      <p className="mt-4 text-sm text-muted-foreground">
        Convites cadastrados para este evento.
      </p>

      <div className="mt-6">
        {invitesQ.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !invitesQ.data || invitesQ.data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Ticket className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Nenhum convite cadastrado.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Nome</th>
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Contato</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitesQ.data.map((inv) => {
                  const st = inv.status as InviteStatus;
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{inv.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {INVITE_TYPE_LABEL[inv.type as InviteType]}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_TONE[st]}`}
                        >
                          {INVITE_STATUS_LABEL[st]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {inv.email || inv.phone || "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {st === "active" ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => emitQr(inv)}
                              disabled={emitting === inv.id}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                            >
                              {emitting === inv.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <QrCode className="h-3 w-3" />
                              )}
                              Emitir QR
                            </button>
                            <button
                              type="button"
                              onClick={() => revoke(inv)}
                              className="rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                            >
                              Revogar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
            setQrInvite(null);
          }
        }}
        token={qrToken}
        title={qrInvite ? `QR do convite · ${qrInvite.name}` : "QR do convite"}
        description="Uso único (1 entrada). Guarde ou envie ao convidado agora — o token não voltará a ser exibido."
        meta={
          qrInvite
            ? [
                { label: "Tipo", value: INVITE_TYPE_LABEL[qrInvite.type as InviteType] },
                { label: "Uso", value: "1 entrada" },
              ]
            : undefined
        }
      />
    </div>
  );
}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
