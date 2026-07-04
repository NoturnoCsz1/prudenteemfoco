import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Gauge, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute(
  "/_authenticated/admin/eventos/$id/access-engine",
)({
  head: () => ({
    meta: [
      { title: "Access Engine — Operação · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccessEnginePage,
});

type SubjectType = "invite" | "credential" | "user";
type TargetType = "event" | "sector" | "space";
type AttemptStatus = "processing" | "allowed" | "denied";

type ProcessResult = {
  attempt_id: string;
  decision: AttemptStatus;
  reason: string | null;
  rule_applied: string | null;
};

type RecentAttempt = {
  id: string;
  subject_type: SubjectType;
  subject_id: string;
  target_type: TargetType;
  target_id: string;
  status: AttemptStatus;
  decision_reason: string | null;
  rule_applied: string | null;
  created_at: string;
};

function AccessEnginePage() {
  const { id: eventId } = Route.useParams();

  const eventQuery = useQuery({
    queryKey: ["admin", "event-min", eventId],
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

  const invitesQuery = useQuery({
    queryKey: ["engine", "invites", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_invites")
        .select("id, name, type, status")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const credsQuery = useQuery({
    queryKey: ["engine", "credentials", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_credentials")
        .select("id, holder_name, role_type, status")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const sectorsQuery = useQuery({
    queryKey: ["engine", "sectors", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_sectors")
        .select("id, name")
        .eq("event_id", eventId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const spacesQuery = useQuery({
    queryKey: ["engine", "spaces", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservable_spaces")
        .select("id, code")
        .eq("event_id", eventId)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const membersQuery = useQuery({
    queryKey: ["engine", "members", eventQuery.data?.organization_id],
    enabled: !!eventQuery.data?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id, role, status")
        .eq("organization_id", eventQuery.data!.organization_id)
        .eq("status", "active");
      if (error) throw error;
      return data ?? [];
    },
  });

  const attemptsQuery = useQuery({
    queryKey: ["engine", "attempts", eventId],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              c: string,
              v: string,
            ) => {
              order: (
                c: string,
                o: { ascending: boolean },
              ) => {
                limit: (
                  n: number,
                ) => Promise<{ data: RecentAttempt[] | null; error: unknown }>;
              };
            };
          };
        };
      })
        .from("access_attempts")
        .select(
          "id, subject_type, subject_id, target_type, target_id, status, decision_reason, rule_applied, created_at",
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error as Error;
      return data ?? [];
    },
  });

  const [subjectType, setSubjectType] = useState<SubjectType>("invite");
  const [subjectId, setSubjectId] = useState<string>("");
  const [targetType, setTargetType] = useState<TargetType>("event");
  const [targetId, setTargetId] = useState<string>(eventId);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [running, setRunning] = useState(false);

  const subjectOptions = useMemo(() => {
    if (subjectType === "invite")
      return (invitesQuery.data ?? []).map((i) => ({
        id: i.id,
        label: `${i.name} · ${i.type} · ${i.status}`,
      }));
    if (subjectType === "credential")
      return (credsQuery.data ?? []).map((c) => ({
        id: c.id,
        label: `${c.holder_name} · ${c.role_type} · ${c.status}`,
      }));
    return (membersQuery.data ?? []).map((m) => ({
      id: m.user_id,
      label: `${m.user_id.slice(0, 8)}… · ${m.role}`,
    }));
  }, [subjectType, invitesQuery.data, credsQuery.data, membersQuery.data]);

  const targetOptions = useMemo(() => {
    if (targetType === "event")
      return [{ id: eventId, label: eventQuery.data?.title ?? "Este evento" }];
    if (targetType === "sector")
      return (sectorsQuery.data ?? []).map((s) => ({ id: s.id, label: s.name }));
    return (spacesQuery.data ?? []).map((s) => ({ id: s.id, label: s.code }));
  }, [
    targetType,
    eventId,
    eventQuery.data?.title,
    sectorsQuery.data,
    spacesQuery.data,
  ]);

  async function runSimulation() {
    if (!subjectId || !targetId) {
      toast.error("Selecione sujeito e alvo");
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: ProcessResult[] | null; error: unknown }>
      )("process_access_attempt", {
        _event_id: eventId,
        _subject_type: subjectType,
        _subject_id: subjectId,
        _target_type: targetType,
        _target_id: targetId,
      });
      if (error) throw error as Error;
      const row = Array.isArray(data) ? data[0] : (data as ProcessResult | null);
      if (row) setResult(row);
      await attemptsQuery.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-5 md:p-8">
      <OperationsNav
        eventId={eventId}
        active="engine"
        eventTitle={eventQuery.data?.title}
      />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest">
              Simulador de decisão
            </h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Nenhuma entrada física é executada. Apenas simulação — allow/deny.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Sujeito</label>
              <div className="mt-1 flex gap-2">
                <select
                  value={subjectType}
                  onChange={(e) => {
                    setSubjectType(e.target.value as SubjectType);
                    setSubjectId("");
                  }}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="invite">Convite</option>
                  <option value="credential">Credencial</option>
                  <option value="user">Usuário</option>
                </select>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Selecione…</option>
                  {subjectOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Alvo</label>
              <div className="mt-1 flex gap-2">
                <select
                  value={targetType}
                  onChange={(e) => {
                    const t = e.target.value as TargetType;
                    setTargetType(t);
                    setTargetId(t === "event" ? eventId : "");
                  }}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="event">Evento</option>
                  <option value="sector">Setor</option>
                  <option value="space">Espaço</option>
                </select>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Selecione…</option>
                  {targetOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              onClick={runSimulation}
              disabled={running || !subjectId || !targetId}
              className="w-full"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processando…
                </>
              ) : (
                "Simular decisão"
              )}
            </Button>
          </div>

          {result ? (
            <div
              className={`mt-4 rounded-md border p-3 text-sm ${
                result.decision === "allowed"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {result.decision === "allowed" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {result.decision.toUpperCase()}
              </div>
              <div className="mt-1 text-xs opacity-90">
                Motivo: <code>{result.reason ?? "—"}</code>
              </div>
              <div className="text-xs opacity-90">
                Regra: <code>{result.rule_applied ?? "—"}</code>
              </div>
              <div className="mt-1 text-[10px] opacity-70">
                Attempt: {result.attempt_id}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest">
              Tentativas recentes
            </h2>
          </div>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto text-xs">
            {attemptsQuery.isLoading ? (
              <div className="py-6 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              </div>
            ) : (attemptsQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground">
                Nenhuma tentativa registrada ainda.
              </p>
            ) : (
              (attemptsQuery.data ?? []).map((a) => (
                <div
                  key={a.id}
                  className="rounded border border-border/60 p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px]">
                      {a.subject_type} → {a.target_type}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        a.status === "allowed"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : a.status === "denied"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {a.rule_applied ?? "—"} · {a.decision_reason ?? "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70">
                    {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
