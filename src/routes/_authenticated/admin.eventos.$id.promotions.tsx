import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import { useOrgMembership } from "@/hooks/use-org-membership";
import type { Database } from "@/integrations/supabase/types";

type PromotionType = Database["public"]["Enums"]["promotion_type"];

const TYPE_LABEL: Record<PromotionType, string> = {
  discount: "Desconto",
  vip_access: "Acesso VIP",
  early_access: "Acesso antecipado",
};
const TYPES: PromotionType[] = ["discount", "vip_access", "early_access"];

export const Route = createFileRoute(
  "/_authenticated/admin/eventos/$id/promotions",
)({
  head: () => ({ meta: [{ title: "Promoções — Prudente em Foco" }] }),
  component: PromotionsPage,
});

function PromotionsPage() {
  const { id: eventId } = Route.useParams();
  const { data: membership } = useOrgMembership();
  const orgId = membership?.organization_id;
  const qc = useQueryClient();

  const { data: event } = useQuery({
    queryKey: ["event-title", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("title")
        .eq("id", eventId)
        .maybeSingle();
      return data;
    },
  });

  const { data: promoters } = useQuery({
    queryKey: ["promoters-list", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promoters")
        .select("id, name, code, active")
        .eq("event_id", eventId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: promotions, isLoading } = useQuery({
    queryKey: ["promotions", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("id, title, type, active, promoter_id, rules, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [title, setTitle] = useState("");
  const [type, setType] = useState<PromotionType>("discount");
  const [promoterId, setPromoterId] = useState<string>("");
  const [rulesText, setRulesText] = useState('{"value": 10, "unit": "percent"}');

  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("sem organização");
      let rules: unknown = {};
      try {
        rules = rulesText.trim() ? JSON.parse(rulesText) : {};
      } catch {
        throw new Error("Regras devem ser JSON válido");
      }
      const { error } = await supabase.from("promotions").insert({
        organization_id: orgId,
        event_id: eventId,
        title: title.trim(),
        type,
        promoter_id: promoterId || null,
        rules: rules as never,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Promoção criada.");
      setTitle("");
      qc.invalidateQueries({ queryKey: ["promotions", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (args: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("promotions")
        .update({ active: args.active })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promotions", eventId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Promoção removida.");
      qc.invalidateQueries({ queryKey: ["promotions", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <OperationsNav
        eventId={eventId}
        active="promotions"
        eventTitle={event?.title}
      />

      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Nova promoção
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || create.isPending) return;
            create.mutate();
          }}
          className="mt-4 grid gap-3 md:grid-cols-2"
        >
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Título
            </span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              placeholder="Ex.: 10% para lista amiga"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Tipo
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PromotionType)}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Promoter (opcional)
            </span>
            <select
              value={promoterId}
              onChange={(e) => setPromoterId(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            >
              <option value="">Nenhum</option>
              {promoters?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-1">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Regras (JSON)
            </span>
            <input
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              placeholder='{"value":10,"unit":"percent"}'
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={create.isPending || !title.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Criar promoção
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-surface">
        <div className="border-b border-border p-5 md:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Campanhas
          </h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !promotions?.length ? (
          <div className="p-6 text-sm text-muted-foreground">
            Nenhuma promoção cadastrada.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {promotions.map((p) => {
              const promoter = promoters?.find((x) => x.id === p.promoter_id);
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between md:p-6"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <span className="rounded-md border border-border-strong px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {TYPE_LABEL[p.type as PromotionType]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {promoter
                        ? `Promoter: ${promoter.name}`
                        : "Sem promoter"}
                      {" · "}
                      <code className="font-mono">
                        {JSON.stringify(p.rules)}
                      </code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        toggle.mutate({ id: p.id, active: !p.active })
                      }
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                        p.active
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border-strong text-muted-foreground"
                      }`}
                    >
                      {p.active ? "Ativa" : "Inativa"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Remover promoção?")) remove.mutate(p.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-border-strong px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
