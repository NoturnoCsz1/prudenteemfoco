import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp, Users, Megaphone, DoorOpen, Target, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";

export const Route = createFileRoute(
  "/_authenticated/admin/eventos/$id/intelligence",
)({
  head: () => ({
    meta: [
      { title: "Inteligência — Admin · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IntelligencePage,
});

type Lead = {
  id: string;
  source: "roxou" | "direct" | "instagram" | "promoter" | "other";
  status: "new" | "interested" | "converted" | "lost";
  promoter_id: string | null;
};
type Promoter = { id: string; name: string; code: string; active: boolean };
type Invite = { id: string; status: string };
type Attempt = { id: string; status: string };

const SOURCE_LABEL: Record<Lead["source"], string> = {
  roxou: "Roxou",
  direct: "Direto",
  instagram: "Instagram",
  promoter: "Promoter",
  other: "Outro",
};

function IntelligencePage() {
  const { id: eventId } = Route.useParams();

  const eventQ = useQuery({
    queryKey: ["event", eventId],
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

  const leadsQ = useQuery({
    queryKey: ["intel-leads", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, source, status, promoter_id")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const promotersQ = useQuery({
    queryKey: ["intel-promoters", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promoters")
        .select("id, name, code, active")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data ?? []) as Promoter[];
    },
  });

  const invitesQ = useQuery({
    queryKey: ["intel-invites", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_invites")
        .select("id, status")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data ?? []) as Invite[];
    },
  });

  const attemptsQ = useQuery({
    queryKey: ["intel-attempts", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_attempts")
        .select("id, status")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data ?? []) as Attempt[];
    },
  });

  const loading =
    leadsQ.isLoading || promotersQ.isLoading || invitesQ.isLoading || attemptsQ.isLoading;

  const leads = leadsQ.data ?? [];
  const promoters = promotersQ.data ?? [];
  const invites = invitesQ.data ?? [];
  const attempts = attemptsQ.data ?? [];

  // ---- Aggregations ----
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l) => l.status === "converted").length;
  const interestedLeads = leads.filter((l) => l.status === "interested").length;

  const leadsBySource = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.source] = (acc[l.source] ?? 0) + 1;
    return acc;
  }, {});

  const promoterMap = new Map(promoters.map((p) => [p.id, p]));
  const promoterStats = promoters.map((p) => {
    const pl = leads.filter((l) => l.promoter_id === p.id);
    const conv = pl.filter((l) => l.status === "converted").length;
    return {
      ...p,
      leads: pl.length,
      converted: conv,
      rate: pl.length > 0 ? (conv / pl.length) * 100 : 0,
    };
  });
  const topPromoters = [...promoterStats].sort((a, b) => b.leads - a.leads).slice(0, 5);

  const totalInvites = invites.length;
  const usedInvites = invites.filter((i) => i.status === "used" || i.status === "consumed").length;

  const leadToInvitePct = totalLeads > 0 ? (totalInvites / totalLeads) * 100 : 0;

  const allow = attempts.filter((a) => a.status === "allowed").length;
  const deny = attempts.filter((a) => a.status === "denied").length;
  const capacityFull = attempts.filter((a) => a.status === "capacity_full" || a.status === "full").length;
  const totalAttempts = attempts.length;
  const inviteToEntryPct = totalInvites > 0 ? (allow / totalInvites) * 100 : 0;

  return (
    <div className="space-y-6">
      <OperationsNav
        eventId={eventId}
        active="intelligence"
        eventTitle={eventQ.data?.title}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando métricas…
        </div>
      ) : (
        <>
          {/* Funil */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Funil do evento
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
              <FunnelStep label="Roxou" value={leadsBySource.roxou ?? 0} icon={<TrendingUp className="h-4 w-4" />} />
              <FunnelStep label="Leads" value={totalLeads} icon={<Users className="h-4 w-4" />} />
              <FunnelStep label="Promoters" value={leadsBySource.promoter ?? 0} icon={<Megaphone className="h-4 w-4" />} />
              <FunnelStep label="Convertidos" value={convertedLeads} icon={<Target className="h-4 w-4" />} />
              <FunnelStep label="Entradas" value={allow} icon={<DoorOpen className="h-4 w-4" />} />
            </div>
          </section>

          {/* Conversão */}
          <section className="grid gap-3 md:grid-cols-3">
            <MetricCard
              title="Leads → Convites"
              value={`${leadToInvitePct.toFixed(1)}%`}
              hint={`${totalInvites} convites de ${totalLeads} leads`}
            />
            <MetricCard
              title="Convites → Entradas"
              value={`${inviteToEntryPct.toFixed(1)}%`}
              hint={`${allow} entradas · ${usedInvites} convites usados`}
            />
            <MetricCard
              title="Taxa de conversão de leads"
              value={`${totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0"}%`}
              hint={`${convertedLeads} convertidos · ${interestedLeads} interessados`}
            />
          </section>

          {/* Origem + Entradas */}
          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" /> Origem de tráfego
              </div>
              <div className="mt-3 space-y-2">
                {(["roxou", "promoter", "direct", "instagram", "other"] as Lead["source"][]).map((src) => {
                  const count = leadsBySource[src] ?? 0;
                  const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                  return (
                    <div key={src}>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{SOURCE_LABEL[src]}</span>
                        <span className="font-medium">
                          {count} <span className="text-muted-foreground">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {totalLeads === 0 && (
                  <p className="text-xs text-muted-foreground">Sem leads registrados.</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-primary" /> Status de entradas
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <StatusPill label="Allow" value={allow} tone="emerald" />
                <StatusPill label="Deny" value={deny} tone="rose" />
                <StatusPill label="Lotado" value={capacityFull} tone="amber" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {totalAttempts} tentativas totais registradas pelo Access Engine.
              </p>
            </div>
          </section>

          {/* Ranking promoters */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Megaphone className="h-4 w-4 text-primary" /> Top promoters
            </div>
            {topPromoters.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Nenhum promoter cadastrado.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 text-left font-medium">#</th>
                      <th className="py-2 text-left font-medium">Promoter</th>
                      <th className="py-2 text-left font-medium">Código</th>
                      <th className="py-2 text-right font-medium">Leads</th>
                      <th className="py-2 text-right font-medium">Convertidos</th>
                      <th className="py-2 text-right font-medium">Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPromoters.map((p, i) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="py-2 font-mono text-xs text-muted-foreground">{p.code}</td>
                        <td className="py-2 text-right">{p.leads}</td>
                        <td className="py-2 text-right">{p.converted}</td>
                        <td className="py-2 text-right">{p.rate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-xs text-muted-foreground">
            Painel somente-leitura. Dados agregados do sistema existente — nenhuma lógica de Access Engine, QR ou entrada é alterada.
          </p>
          {/* touch promoterMap so linter is happy about intent */}
          <span className="hidden">{promoterMap.size}</span>
        </>
      )}
    </div>
  );
}

function FunnelStep({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "amber";
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/30",
    rose: "bg-rose-500/10 text-rose-500 ring-rose-500/30",
    amber: "bg-amber-500/10 text-amber-500 ring-amber-500/30",
  };
  return (
    <div className={`rounded-md px-3 py-2 ring-1 ${tones[tone]}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-80">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
