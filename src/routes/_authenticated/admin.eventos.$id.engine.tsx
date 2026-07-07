import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Gauge, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import type { Database } from "@/integrations/supabase/types";

type Attempt = Database["public"]["Tables"]["access_attempts"]["Row"];

export const Route = createFileRoute(
  "/_authenticated/admin/eventos/$id/engine",
)({
  head: () => ({
    meta: [
      { title: "Access Engine — Admin · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EnginePage,
});

function EnginePage() {
  const { id: eventId } = Route.useParams();

  const eventQ = useQuery({
    queryKey: ["admin", "event", eventId, "meta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const attemptsQ = useQuery({
    queryKey: ["admin", "engine", "attempts", eventId],
    queryFn: async (): Promise<Attempt[]> => {
      const { data, error } = await supabase
        .from("access_attempts")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Attempt[];
    },
    refetchInterval: 5000,
  });

  const allowed = attemptsQ.data?.filter((a) => a.status === "allowed").length ?? 0;
  const denied = attemptsQ.data?.filter((a) => a.status === "denied").length ?? 0;

  return (
    <div className="p-5 md:p-8">
      <OperationsNav
        eventId={eventId}
        active="engine"
        eventTitle={eventQ.data?.title}
      />

      <p className="mt-4 text-sm text-muted-foreground">
        Histórico de decisões do Access Engine. Visualização somente — as
        regras são aplicadas automaticamente pelo motor de acesso.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-3">
          <div className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
            Total
          </div>
          <div className="mt-1 font-display text-xl sm:text-2xl font-semibold">
            {attemptsQ.data?.length ?? "—"}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-3">
          <div className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
            Permitidas
          </div>
          <div className="mt-1 font-display text-xl sm:text-2xl font-semibold text-emerald-500">
            {allowed}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-3">
          <div className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground">
            Negadas
          </div>
          <div className="mt-1 font-display text-xl sm:text-2xl font-semibold text-destructive">
            {denied}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {attemptsQ.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !attemptsQ.data || attemptsQ.data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Gauge className="mx-auto mb-2 h-6 w-6 opacity-40" />
            Nenhuma decisão registrada.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Quando</th>
                  <th className="px-3 py-2 text-left font-medium">Sujeito</th>
                  <th className="px-3 py-2 text-left font-medium">Alvo</th>
                  <th className="px-3 py-2 text-left font-medium">Decisão</th>
                  <th className="px-3 py-2 text-left font-medium">Motivo</th>
                  <th className="px-3 py-2 text-left font-medium">Regra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attemptsQ.data.map((a) => {
                  const allow = a.status === "allowed";
                  return (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                        {new Date(a.created_at ?? "").toLocaleTimeString("pt-BR")}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {a.subject_type}
                      </td>
                      <td className="px-3 py-2 text-xs">{a.target_type}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                            allow
                              ? "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30"
                              : "bg-destructive/15 text-destructive ring-destructive/30"
                          }`}
                        >
                          {allow ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {allow ? "Allow" : "Deny"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {a.decision_reason || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {a.rule_applied || "—"}
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
