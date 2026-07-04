import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Attempt = {
  id: string;
  status: string;
  decision_reason: string | null;
  rule_applied: string | null;
  subject_type: string;
  target_type: string;
  created_at: string;
};

export function LiveLog({
  eventId,
  limit = 20,
}: {
  eventId?: string;
  limit?: number;
}) {
  const q = useQuery({
    queryKey: ["live-log", eventId ?? "all", limit],
    queryFn: async (): Promise<Attempt[]> => {
      let qb = supabase
        .from("access_attempts")
        .select(
          "id, status, decision_reason, rule_applied, subject_type, target_type, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      if (eventId) qb = qb.eq("event_id", eventId);
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as Attempt[];
    },
    refetchInterval: 5000,
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!q.data || q.data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        Nenhuma atividade registrada.
      </div>
    );
  }

  return (
    <ul className="max-h-[360px] space-y-1.5 overflow-y-auto rounded-lg border border-border bg-card p-2">
      {q.data.map((a) => {
        const allow = a.status === "allowed";
        return (
          <li
            key={a.id}
            className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/40"
          >
            {allow ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-medium ${
                    allow ? "text-emerald-500" : "text-destructive"
                  }`}
                >
                  {allow ? "Permitido" : "Negado"}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {new Date(a.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <div className="truncate text-muted-foreground">
                {a.subject_type} → {a.target_type}
                {a.decision_reason ? ` · ${a.decision_reason}` : ""}
                {a.rule_applied ? ` · ${a.rule_applied}` : ""}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
