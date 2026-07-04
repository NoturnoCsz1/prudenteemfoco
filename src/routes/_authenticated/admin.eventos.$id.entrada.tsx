import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, DoorOpen, Loader2, Plus, ShieldX, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute(
  "/_authenticated/admin/eventos/$id/entrada",
)({
  head: () => ({
    meta: [
      { title: "Entrada — Operação · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EntrancePage,
});

type TargetType = "event" | "sector" | "space";
type SessionStatus = "active" | "consumed" | "blocked";
type TokenStatus = "active" | "revoked" | "expired";

type RedeemResult = {
  session_id: string;
  attempt_id: string | null;
  status: SessionStatus;
  reason: string | null;
  rule_applied: string | null;
  remaining_capacity: number | null;
};

type CreateTokenResult = { token_id: string; token_plain: string };

type Token = {
  id: string;
  target_type: TargetType;
  target_id: string;
  label: string | null;
  status: TokenStatus;
  usage_count: number;
  capacity_limit: number | null;
  created_at: string;
};

type Session = {
  id: string;
  token_id: string | null;
  space_id: string | null;
  sector_id: string | null;
  subject_type: string;
  subject_id: string;
  status: SessionStatus;
  reason: string | null;
  created_at: string;
};

// Weakly-typed helpers because tables/RPCs are newer than types.ts regen
const sb = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: unknown }>;
};

function EntrancePage() {
  const { id: eventId } = Route.useParams();

  const eventQuery = useQuery({
    queryKey: ["admin", "event-min", eventId],
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

  const sectorsQuery = useQuery({
    queryKey: ["entrance", "sectors", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_sectors")
        .select("id, name, capacity")
        .eq("event_id", eventId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const spacesQuery = useQuery({
    queryKey: ["entrance", "spaces", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservable_spaces")
        .select("id, code, capacity")
        .eq("event_id", eventId)
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const tokensQuery = useQuery({
    queryKey: ["entrance", "tokens", eventId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("access_tokens")
        .select(
          "id, target_type, target_id, label, status, usage_count, capacity_limit, created_at",
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error as Error;
      return (data ?? []) as Token[];
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ["entrance", "sessions", eventId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("access_sessions")
        .select(
          "id, token_id, space_id, sector_id, subject_type, subject_id, status, reason, created_at",
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error as Error;
      return (data ?? []) as Session[];
    },
    refetchInterval: 5000,
  });

  const spaceOccupancy = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessionsQuery.data ?? []) {
      if (s.space_id && s.status === "active") {
        map.set(s.space_id, (map.get(s.space_id) ?? 0) + 1);
      }
    }
    return map;
  }, [sessionsQuery.data]);

  // Token issue form
  const [tokenTarget, setTokenTarget] = useState<TargetType>("event");
  const [tokenTargetId, setTokenTargetId] = useState<string>(eventId);
  const [tokenCap, setTokenCap] = useState<string>("");
  const [tokenLabel, setTokenLabel] = useState<string>("");
  const [issuing, setIssuing] = useState(false);
  const [lastToken, setLastToken] = useState<CreateTokenResult | null>(null);

  const tokenTargetOptions = useMemo(() => {
    if (tokenTarget === "event")
      return [{ id: eventId, label: eventQuery.data?.title ?? "Este evento" }];
    if (tokenTarget === "sector")
      return (sectorsQuery.data ?? []).map((s) => ({ id: s.id, label: s.name }));
    return (spacesQuery.data ?? []).map((s) => ({ id: s.id, label: s.code }));
  }, [tokenTarget, eventId, eventQuery.data, sectorsQuery.data, spacesQuery.data]);

  async function issueToken() {
    if (!tokenTargetId) {
      toast.error("Selecione um alvo");
      return;
    }
    setIssuing(true);
    try {
      const { data, error } = await sb.rpc("create_access_token", {
        _event_id: eventId,
        _target_type: tokenTarget,
        _target_id: tokenTargetId,
        _capacity_limit: tokenCap ? Number(tokenCap) : null,
        _label: tokenLabel || null,
      });
      if (error) throw error as Error;
      const row = Array.isArray(data) ? data[0] : (data as CreateTokenResult);
      setLastToken(row);
      toast.success("Token emitido. Copie o valor agora — não será exibido novamente.");
      setTokenLabel("");
      setTokenCap("");
      await tokensQuery.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIssuing(false);
    }
  }

  async function revokeToken(id: string) {
    try {
      const { error } = await sb.rpc("revoke_access_token", { _token_id: id });
      if (error) throw error as Error;
      toast.success("Token revogado");
      await tokensQuery.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // Redeem form
  const [redeemToken, setRedeemToken] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null);

  async function runRedeem() {
    if (!redeemToken.trim()) return;
    setRedeeming(true);
    setRedeemResult(null);
    try {
      const { data, error } = await sb.rpc("redeem_access_token", {
        _token_plain: redeemToken.trim(),
      });
      if (error) throw error as Error;
      const row = Array.isArray(data) ? data[0] : (data as RedeemResult);
      setRedeemResult(row);
      if (row?.status === "active") toast.success("Entrada liberada");
      else toast.error(`Bloqueada: ${row?.reason ?? "—"}`);
      setRedeemToken("");
      await Promise.all([tokensQuery.refetch(), sessionsQuery.refetch()]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="w-full min-w-0 p-4 sm:p-5 md:p-8">
      <OperationsNav
        eventId={eventId}
        active="entrance"
        eventTitle={eventQuery.data?.title}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Emissão de tokens */}
        <section className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest">
              Emitir token (QR)
            </h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            O token é aleatório. Guardamos apenas o hash — o valor em texto
            aparece uma única vez logo abaixo após a emissão.
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <select
                value={tokenTarget}
                onChange={(e) => {
                  const t = e.target.value as TargetType;
                  setTokenTarget(t);
                  setTokenTargetId(t === "event" ? eventId : "");
                }}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="event">Evento</option>
                <option value="sector">Setor</option>
                <option value="space">Espaço</option>
              </select>
              <select
                value={tokenTargetId}
                onChange={(e) => setTokenTargetId(e.target.value)}
                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Selecione…</option>
                {tokenTargetOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={tokenCap}
                onChange={(e) => setTokenCap(e.target.value)}
                placeholder="Limite (opcional)"
                className="h-9 w-40 rounded-md border border-input bg-background px-2 text-sm"
              />
              <input
                value={tokenLabel}
                onChange={(e) => setTokenLabel(e.target.value)}
                placeholder="Rótulo (opcional)"
                maxLength={120}
                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
            <Button onClick={issueToken} disabled={issuing || !tokenTargetId} className="w-full">
              {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Emitir"}
            </Button>

            {lastToken ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
                <div className="mb-1 font-semibold text-emerald-200">
                  Token gerado — copie agora
                </div>
                <div className="flex items-center gap-2">
                  <code className="break-all rounded bg-background/50 px-2 py-1 font-mono">
                    {lastToken.token_plain}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(lastToken.token_plain);
                      toast.success("Copiado");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Validação de QR */}
        <section className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest">
              Validar entrada
            </h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Cola o valor do QR abaixo. A validação passa pelo Access Engine e é
            atômica (bloqueia dupla entrada e overflow).
          </p>
          <div className="mt-4 space-y-3">
            <textarea
              value={redeemToken}
              onChange={(e) => setRedeemToken(e.target.value)}
              rows={2}
              placeholder="Cole o token do QR aqui…"
              className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
            />
            <Button onClick={runRedeem} disabled={redeeming || !redeemToken.trim()} className="w-full">
              {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validar"}
            </Button>
            {redeemResult ? (
              <div
                className={`rounded-md border p-3 text-sm ${
                  redeemResult.status === "active"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {redeemResult.status === "active" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {redeemResult.status.toUpperCase()}
                </div>
                <div className="mt-1 text-xs opacity-90">
                  Motivo: <code>{redeemResult.reason ?? "—"}</code>
                </div>
                <div className="text-xs opacity-90">
                  Regra: <code>{redeemResult.rule_applied ?? "—"}</code>
                </div>
                {redeemResult.remaining_capacity !== null ? (
                  <div className="text-xs opacity-90">
                    Capacidade restante: {redeemResult.remaining_capacity}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {/* Tokens ativos */}
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest">Tokens</h2>
          <div className="mt-3 max-h-[380px] space-y-2 overflow-y-auto text-xs">
            {(tokensQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground">Nenhum token emitido.</p>
            ) : (
              (tokensQuery.data ?? []).map((t) => (
                <div key={t.id} className="flex items-start justify-between rounded border border-border/60 p-2">
                  <div>
                    <div className="font-mono text-[11px]">
                      {t.target_type} · {t.label ?? t.id.slice(0, 8)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      uso {t.usage_count}
                      {t.capacity_limit ? ` / ${t.capacity_limit}` : ""} · {t.status}
                    </div>
                  </div>
                  {t.status === "active" ? (
                    <Button size="sm" variant="ghost" onClick={() => revokeToken(t.id)}>
                      <ShieldX className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Ao vivo */}
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest">Ao vivo</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {(spacesQuery.data ?? [])
              .filter((s) => s.capacity)
              .map((s) => {
                const used = spaceOccupancy.get(s.id) ?? 0;
                const cap = s.capacity ?? 0;
                const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;
                return (
                  <div key={s.id} className="rounded border border-border/60 p-2">
                    <div className="font-mono text-[11px]">{s.code}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {used} / {cap}
                    </div>
                    <div className="mt-1 h-1.5 rounded bg-muted">
                      <div
                        className={`h-1.5 rounded ${pct >= 100 ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Últimas sessões
          </h3>
          <div className="mt-2 max-h-[240px] space-y-1 overflow-y-auto text-xs">
            {(sessionsQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground">Sem sessões ainda.</p>
            ) : (
              (sessionsQuery.data ?? []).map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded border border-border/60 p-1.5">
                  <span className="font-mono text-[10px]">
                    {s.subject_type} · {new Date(s.created_at).toLocaleTimeString()}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      s.status === "active"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : s.status === "consumed"
                          ? "bg-muted text-muted-foreground"
                          : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
