import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";

export const Route = createFileRoute(
  "/_authenticated/admin/eventos/$id/leads",
)({
  head: () => ({
    meta: [
      { title: "Leads — Admin · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadsPage,
});

type LeadStatus = "new" | "interested" | "converted" | "lost";
type LeadSource = "roxou" | "direct" | "instagram" | "promoter" | "other";

type Lead = {
  id: string;
  event_id: string;
  organization_id: string;
  promoter_id: string | null;
  source: LeadSource;
  status: LeadStatus;
  name: string | null;
  contact: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type Promoter = { id: string; name: string; code: string };

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Novo",
  interested: "Interessado",
  converted: "Convertido",
  lost: "Perdido",
};
const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-primary/15 text-primary ring-primary/30",
  interested: "bg-amber-500/15 text-amber-500 ring-amber-500/30",
  converted: "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30",
  lost: "bg-muted text-muted-foreground ring-border",
};
const SOURCE_LABEL: Record<LeadSource, string> = {
  roxou: "Roxou",
  direct: "Direto",
  instagram: "Instagram",
  promoter: "Promoter",
  other: "Outro",
};

function LeadsPage() {
  const { id: eventId } = Route.useParams();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    contact: "",
    source: "direct" as LeadSource,
    promoter_id: "",
  });

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

  const leadsQ = useQuery({
    queryKey: ["admin", "leads", eventId],
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await (supabase as any)
        .from("leads")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const promotersQ = useQuery({
    queryKey: ["admin", "promoters", eventId, "select"],
    queryFn: async (): Promise<Promoter[]> => {
      const { data, error } = await (supabase as any)
        .from("promoters")
        .select("id, name, code")
        .eq("event_id", eventId)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Promoter[];
    },
  });

  const leads = leadsQ.data ?? [];
  const promoterMap = new Map(promotersQ.data?.map((p) => [p.id, p]) ?? []);

  const totals = {
    total: leads.length,
    byStatus: leads.reduce<Record<LeadStatus, number>>(
      (acc, l) => {
        acc[l.status] = (acc[l.status] ?? 0) + 1;
        return acc;
      },
      { new: 0, interested: 0, converted: 0, lost: 0 },
    ),
    bySource: leads.reduce<Record<string, number>>((acc, l) => {
      acc[l.source] = (acc[l.source] ?? 0) + 1;
      return acc;
    }, {}),
  };

  async function updateStatus(leadId: string, status: LeadStatus) {
    const { error } = await (supabase as any)
      .from("leads")
      .update({ status })
      .eq("id", leadId);
    if (error) return toast.error(error.message);
    toast.success("Lead atualizado.");
    qc.invalidateQueries({ queryKey: ["admin", "leads", eventId] });
  }

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    if (!eventQ.data?.organization_id) return;
    const payload: Record<string, unknown> = {
      event_id: eventId,
      organization_id: eventQ.data.organization_id,
      name: form.name.trim() || null,
      contact: form.contact.trim() || null,
      source: form.source,
      status: "new",
    };
    if (form.promoter_id) {
      payload.promoter_id = form.promoter_id;
      if (form.source === "direct") payload.source = "promoter";
    }
    const { error } = await (supabase as any).from("leads").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Lead registrado.");
    setForm({ name: "", contact: "", source: "direct", promoter_id: "" });
    qc.invalidateQueries({ queryKey: ["admin", "leads", eventId] });
  }

  return (
    <div className="p-5 md:p-8">
      <OperationsNav
        eventId={eventId}
        active="leads"
        eventTitle={eventQ.data?.title}
      />

      <p className="mt-4 text-sm text-muted-foreground">
        Captura de interesse. Leads não interagem com o motor de acesso.
      </p>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Total" value={totals.total} />
        <StatCard label="Novos" value={totals.byStatus.new} />
        <StatCard label="Interessados" value={totals.byStatus.interested} tone="amber" />
        <StatCard label="Convertidos" value={totals.byStatus.converted} tone="allow" />
        <StatCard label="Perdidos" value={totals.byStatus.lost} tone="muted" />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          onSubmit={createLead}
          className="rounded-lg border border-border bg-card p-4 lg:col-span-1"
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Registrar lead
          </h2>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              placeholder="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              placeholder="Contato (email/telefone)"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              value={form.source}
              onChange={(e) =>
                setForm({ ...form, source: e.target.value as LeadSource })
              }
            >
              {(Object.keys(SOURCE_LABEL) as LeadSource[]).map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              value={form.promoter_id}
              onChange={(e) =>
                setForm({ ...form, promoter_id: e.target.value })
              }
            >
              <option value="">Sem promoter</option>
              {promotersQ.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Criar lead
            </button>
          </div>
        </form>

        <div className="lg:col-span-2">
          {leadsQ.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <UserPlus className="mx-auto mb-2 h-6 w-6 opacity-40" />
              Nenhum lead capturado ainda.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Nome</th>
                    <th className="px-3 py-2 text-left font-medium">Origem</th>
                    <th className="px-3 py-2 text-left font-medium">Promoter</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Data</th>
                    <th className="px-3 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <div className="font-medium">{l.name || "—"}</div>
                        {l.contact && (
                          <div className="text-xs text-muted-foreground">
                            {l.contact}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {SOURCE_LABEL[l.source] ?? l.source}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {l.promoter_id
                          ? promoterMap.get(l.promoter_id)?.name ?? "—"
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_TONE[l.status]}`}
                        >
                          {STATUS_LABEL[l.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                        {new Date(l.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <select
                          value={l.status}
                          onChange={(e) =>
                            updateStatus(l.id, e.target.value as LeadStatus)
                          }
                          className="rounded-md border border-border bg-transparent px-2 py-1 text-xs"
                        >
                          {(Object.keys(STATUS_LABEL) as LeadStatus[]).map(
                            (s) => (
                              <option key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "allow" | "amber" | "muted";
}) {
  const toneClass =
    tone === "allow"
      ? "text-emerald-500"
      : tone === "amber"
        ? "text-amber-500"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-2 font-display text-2xl font-semibold ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
