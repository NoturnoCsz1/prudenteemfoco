import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import { Button } from "@/components/ui/button";
import { AccessValidator } from "@/components/access/AccessValidator";
import { QrCodeModal } from "@/components/access/QrCodeModal";

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
type TokenStatus = "active" | "revoked" | "expired";

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
  status: "active" | "consumed" | "blocked";
  reason: string | null;
  created_at: string;
};

const sb = supabase as unknown as {
  from: (t: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (col: string, opts?: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown; error: unknown }> };
      };
    };
  };
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
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
      const res = await sb
        .from("access_tokens")
        .select(
          "id, target_type, target_id, label, status, usage_count, capacity_limit, created_at",
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (res.error) throw res.error as Error;
      return (res.data ?? []) as Token[];
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ["entrance", "sessions", eventId],
    queryFn: async () => {
      const res = await sb
        .from("access_sessions")
        .select(
          "id, token_id, space_id, sector_id, subject_type, subject_id, status, reason, created_at",
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (res.error) throw res.error as Error;
      return (res.data ?? []) as Session[];
    },
    refetchInterval: 5000,
  });

  // Token issue form
  const [tokenTarget, setTokenTarget] = useState<TargetType>("event");
  const [tokenTargetId, setTokenTargetId] = useState<string>(eventId);
  const [tokenCap, setTokenCap] = useState<string>("");
  const [tokenLabel, setTokenLabel] = useState<string>("");
  const [issuing, setIssuing] = useState(false);
  const [lastToken, setLastToken] = useState<CreateTokenResult | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

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
      setQrOpen(true);
      toast.success("Token emitido — copie/imprima agora, não voltará a ser exibido.");
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

  return (
    <div className="w-full min-w-0 p-4 sm:p-5 md:p-8">
      <OperationsNav eventId={eventId} active="entrance" eventTitle={eventQuery.data?.title} />

      {/* Primary CTA: scanner */}
      <div className="mt-6">
        <AccessValidator
          expectedEventId={eventId}
          eventTitle={eventQuery.data?.title ?? undefined}
        />
      </div>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
        {/* Token issuance */}
        <section className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest">
              Emitir token (QR)
            </h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Cria um QR compartilhado com um número máximo de utilizações. Para
            gerar convites individuais, use o módulo <strong>Convites</strong>.
            Para credenciais permanentes, use o módulo <strong>Credenciais</strong>.
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={tokenTarget}
                onChange={(e) => {
                  const t = e.target.value as TargetType;
                  setTokenTarget(t);
                  setTokenTargetId(t === "event" ? eventId : "");
                }}
                className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm sm:w-auto"
              >
                <option value="event">Evento</option>
                <option value="sector">Setor</option>
                <option value="space">Espaço</option>
              </select>
              <select
                value={tokenTargetId}
                onChange={(e) => setTokenTargetId(e.target.value)}
                className="h-11 w-full min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Selecione…</option>
                {tokenTargetOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Número máximo de utilizações
              </label>
              <input
                type="number"
                min={1}
                value={tokenCap}
                onChange={(e) => setTokenCap(e.target.value)}
                placeholder="Ilimitado se vazio"
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Define quantas entradas este mesmo QR poderá liberar. Deixe
                vazio para uso ilimitado até revogação.
              </p>
            </div>
            <input
              value={tokenLabel}
              onChange={(e) => setTokenLabel(e.target.value)}
              placeholder="Rótulo (opcional)"
              maxLength={120}
              className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
            <Button onClick={issueToken} disabled={issuing || !tokenTargetId} className="h-11 w-full">
              {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Emitir"}
            </Button>
          </div>
        </section>

        {/* Tokens list */}
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest">Tokens</h2>
          <div className="mt-3 max-h-[380px] space-y-2 overflow-y-auto text-xs">
            {(tokensQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground">Nenhum token emitido.</p>
            ) : (
              (tokensQuery.data ?? []).map((t) => {
                const remaining =
                  t.capacity_limit !== null
                    ? Math.max(0, t.capacity_limit - t.usage_count)
                    : null;
                return (
                  <div
                    key={t.id}
                    className="flex items-start justify-between gap-2 rounded border border-border/60 p-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[11px]">
                        {t.label ?? `${t.target_type} · ${t.id.slice(0, 8)}`}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {t.target_type} · uso {t.usage_count}
                        {t.capacity_limit ? ` / ${t.capacity_limit}` : " (ilimitado)"}
                        {remaining !== null ? ` · restante ${remaining}` : ""} ·{" "}
                        <span
                          className={
                            t.status === "active"
                              ? "text-emerald-400"
                              : "text-destructive"
                          }
                        >
                          {t.status}
                        </span>
                      </div>
                    </div>
                    {t.status === "active" ? (
                      <Button size="sm" variant="ghost" onClick={() => revokeToken(t.id)}>
                        <ShieldX className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Live */}
        <section className="rounded-lg border border-border p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest">Ao vivo</h2>
          <h3 className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Últimas sessões
          </h3>
          <div className="mt-2 max-h-[240px] space-y-1 overflow-y-auto text-xs">
            {(sessionsQuery.data ?? []).length === 0 ? (
              <p className="text-muted-foreground">Sem sessões ainda.</p>
            ) : (
              (sessionsQuery.data ?? []).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded border border-border/60 p-1.5"
                >
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
                    {s.reason ? ` · ${s.reason}` : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <QrCodeModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        token={lastToken?.token_plain ?? null}
        title="QR emitido"
        description="Guarde ou imprima agora — o valor não voltará a ser exibido."
      />
    </div>
  );
}
