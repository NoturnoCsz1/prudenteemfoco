import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Megaphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";

export const Route = createFileRoute(
  "/_authenticated/admin/eventos/$id/promoters",
)({
  head: () => ({
    meta: [
      { title: "Promoters — Admin · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PromotersPage,
});

type Promoter = {
  id: string;
  event_id: string;
  organization_id: string;
  name: string;
  code: string;
  active: boolean;
  notes: string | null;
  created_at: string;
};

type LeadRow = { id: string; promoter_id: string | null; status: string };

function PromotersPage() {
  const { id: eventId } = Route.useParams();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", code: "", notes: "" });

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

  const promotersQ = useQuery({
    queryKey: ["admin", "promoters", eventId],
    queryFn: async (): Promise<Promoter[]> => {
      const { data, error } = await (supabase as any)
        .from("promoters")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Promoter[];
    },
  });

  const leadsQ = useQuery({
    queryKey: ["admin", "leads", eventId, "for-promoters"],
    queryFn: async (): Promise<LeadRow[]> => {
      const { data, error } = await (supabase as any)
        .from("leads")
        .select("id, promoter_id, status")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    },
  });

  const metrics = new Map<string, { leads: number; converted: number }>();
  for (const l of leadsQ.data ?? []) {
    if (!l.promoter_id) continue;
    const m = metrics.get(l.promoter_id) ?? { leads: 0, converted: 0 };
    m.leads += 1;
    if (l.status === "converted") m.converted += 1;
    metrics.set(l.promoter_id, m);
  }

  async function createPromoter(e: React.FormEvent) {
    e.preventDefault();
    if (!eventQ.data?.organization_id) return;
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Informe nome e código.");
      return;
    }
    const { error } = await (supabase as any).from("promoters").insert({
      event_id: eventId,
      organization_id: eventQ.data.organization_id,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase().replace(/\s+/g, "-"),
      notes: form.notes.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Promoter criado.");
    setForm({ name: "", code: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["admin", "promoters", eventId] });
  }

  async function toggleActive(p: Promoter) {
    const { error } = await (supabase as any)
      .from("promoters")
      .update({ active: !p.active })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "promoters", eventId] });
  }

  const promoters = promotersQ.data ?? [];

  return (
    <div className="p-5 md:p-8">
      <OperationsNav
        eventId={eventId}
        active="promoters"
        eventTitle={eventQ.data?.title}
      />

      <p className="mt-4 text-sm text-muted-foreground">
        Origens estruturadas de distribuição. Rastreamento comercial — sem
        interferência no acesso.
      </p>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          onSubmit={createPromoter}
          className="rounded-lg border border-border bg-card p-4 lg:col-span-1"
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Novo promoter
          </h2>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              placeholder="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm font-mono uppercase"
              placeholder="Código único (ex: JOAO01)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <textarea
              className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              placeholder="Observações"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <button
              type="submit"
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Criar promoter
            </button>
          </div>
        </form>

        <div className="lg:col-span-2">
          {promotersQ.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : promoters.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Megaphone className="mx-auto mb-2 h-6 w-6 opacity-40" />
              Nenhum promoter cadastrado.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Nome</th>
                    <th className="px-3 py-2 text-left font-medium">Código</th>
                    <th className="px-3 py-2 text-right font-medium">Leads</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Convertidos
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Conv. %</th>
                    <th className="px-3 py-2 text-right font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {promoters.map((p) => {
                    const m = metrics.get(p.id) ?? { leads: 0, converted: 0 };
                    const rate =
                      m.leads > 0
                        ? Math.round((m.converted / m.leads) * 100)
                        : 0;
                    return (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {p.code}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {m.leads}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-500">
                          {m.converted}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs text-muted-foreground">
                          {rate}%
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                              p.active
                                ? "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30"
                                : "bg-muted text-muted-foreground ring-border"
                            }`}
                          >
                            {p.active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => toggleActive(p)}
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                          >
                            {p.active ? "Desativar" : "Ativar"}
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
      </section>
    </div>
  );
}
