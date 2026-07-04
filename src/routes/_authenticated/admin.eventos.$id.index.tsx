import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CalendarDays,
  CircleDot,
  DoorOpen,
  Loader2,
  MapPin,
  Megaphone,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import { LiveLog } from "@/components/admin/LiveLog";

export const Route = createFileRoute("/_authenticated/admin/eventos/$id/")({
  head: () => ({
    meta: [
      { title: "Centro de Controle — Admin · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { id } = Route.useParams();

  const eventQ = useQuery({
    queryKey: ["admin", "event", id, "overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, title, status, starts_at, ends_at, venue_name, city, organization_id",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const summaryQ = useQuery({
    queryKey: ["admin", "event", id, "summary"],
    queryFn: async () => {
      const dayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const [invites, credentials, allowedToday, deniedToday, spaces, sessions] =
        await Promise.all([
          supabase
            .from("event_invites")
            .select("id", { count: "exact", head: true })
            .eq("event_id", id)
            .eq("status", "active"),
          supabase
            .from("event_credentials")
            .select("id", { count: "exact", head: true })
            .eq("event_id", id)
            .eq("status", "active"),
          supabase
            .from("access_attempts")
            .select("id", { count: "exact", head: true })
            .eq("event_id", id)
            .eq("status", "allowed")
            .gte("created_at", dayStart),
          supabase
            .from("access_attempts")
            .select("id", { count: "exact", head: true })
            .eq("event_id", id)
            .eq("status", "denied")
            .gte("created_at", dayStart),
          supabase
            .from("reservable_spaces")
            .select("id, display_name, code, capacity")
            .eq("event_id", id)
            .order("sort_order", { ascending: true }),
          supabase
            .from("access_sessions")
            .select("space_id")
            .eq("event_id", id)
            .eq("status", "active"),
        ]);
      const occByGroup: Record<string, number> = {};
      (sessions.data ?? []).forEach((s) => {
        if (s.space_id) occByGroup[s.space_id] = (occByGroup[s.space_id] ?? 0) + 1;
      });
      return {
        invitesActive: invites.count ?? 0,
        credentialsActive: credentials.count ?? 0,
        allowedToday: allowedToday.count ?? 0,
        deniedToday: deniedToday.count ?? 0,
        inVenue: (sessions.data ?? []).length,
        spaces: (spaces.data ?? []).map((s) => ({
          id: s.id,
          name: s.display_name || s.code,
          capacity: s.capacity ?? 0,
          occupied: occByGroup[s.id] ?? 0,
        })),
      };
    },
    refetchInterval: 8000,
  });

  const growthQ = useQuery({
    queryKey: ["admin", "event", id, "growth"],
    queryFn: async () => {
      const [leadsRes, promotersRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, source, status, promoter_id")
          .eq("event_id", id),
        supabase
          .from("promoters")
          .select("id, name, code")
          .eq("event_id", id),
      ]);
      const leads = leadsRes.data ?? [];
      const promoters = promotersRes.data ?? [];
      const bySource: Record<string, number> = {};
      leads.forEach((l) => {
        bySource[l.source] = (bySource[l.source] ?? 0) + 1;
      });
      const ranking = promoters
        .map((p) => {
          const pl = leads.filter((l) => l.promoter_id === p.id);
          const conv = pl.filter((l) => l.status === "converted").length;
          return {
            id: p.id,
            name: p.name,
            code: p.code,
            leads: pl.length,
            converted: conv,
            rate: pl.length > 0 ? (conv / pl.length) * 100 : 0,
          };
        })
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 5);
      const converted = leads.filter((l) => l.status === "converted").length;
      return {
        totalLeads: leads.length,
        converted,
        bySource,
        ranking,
      };
    },
    refetchInterval: 15000,
  });

  const now = new Date();
  const ev = eventQ.data;
  const start = ev?.starts_at ? new Date(ev.starts_at) : null;
  const end = ev?.ends_at ? new Date(ev.ends_at) : null;
  const isLive = start && end && start <= now && now <= end;
  const isPast = end && end < now;
  const life = isLive ? "AO VIVO" : isPast ? "ENCERRADO" : "FUTURO";
  const lifeTone = isLive
    ? "bg-[color-mix(in_oklab,var(--live)_18%,transparent)] text-[color:var(--live)] ring-[color-mix(in_oklab,var(--live)_40%,transparent)]"
    : isPast
      ? "bg-muted text-muted-foreground ring-border"
      : "bg-[color-mix(in_oklab,var(--violet)_18%,transparent)] text-[color:var(--violet)] ring-[color-mix(in_oklab,var(--violet)_40%,transparent)]";

  const full = summaryQ.data?.spaces.filter(
    (s) => s.capacity > 0 && s.occupied >= s.capacity,
  ).length ?? 0;

  const bySource = growthQ.data?.bySource ?? {};
  const totalLeads = growthQ.data?.totalLeads ?? 0;

  return (
    <div className="p-5 md:p-8">
      <OperationsNav eventId={id} active="overview" eventTitle={ev?.title} />

      {eventQ.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !ev ? (
        <div className="mt-6 rounded-md border border-border p-6 text-sm text-muted-foreground">
          Evento não encontrado.{" "}
          <Link to="/admin/eventos" className="text-primary underline">
            Voltar
          </Link>
        </div>
      ) : (
        <>
          {/* Status bar */}
          <section className="mt-5 flex flex-wrap items-center gap-2 md:gap-3 text-sm">
            <span
              className={`ops-font inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ring-1 ${lifeTone}`}
            >
              {isLive ? <span className="live-dot" /> : <CircleDot className="h-3 w-3" />}
              {life}
            </span>
            <span className="ops-font inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {start
                ? start.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                : "Sem data"}
            </span>
            {(ev.venue_name || ev.city) && (
              <span className="ops-font inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {[ev.venue_name, ev.city].filter(Boolean).join(" · ")}
              </span>
            )}
            {full > 0 && (
              <span className="ops-font ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400 ring-1 ring-amber-500/30">
                {full} espaço{full > 1 ? "s" : ""} lotado{full > 1 ? "s" : ""}
              </span>
            )}
          </section>

          {/* Hero KPIs — bento row 1 */}
          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <HeroCard
              tone="allow"
              label="Entradas hoje"
              value={summaryQ.data?.allowedToday}
              icon={<DoorOpen className="h-4 w-4" />}
            />
            <HeroCard
              tone="deny"
              label="Negadas hoje"
              value={summaryQ.data?.deniedToday}
              icon={<Activity className="h-4 w-4" />}
            />
            <HeroCard
              tone="info"
              label="No evento agora"
              value={summaryQ.data?.inVenue}
              icon={<Users className="h-4 w-4" />}
            />
            <HeroCard
              tone="growth"
              label="Leads totais"
              value={totalLeads}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </section>

          {/* Bento: live ops (8) + growth column (4) */}
          <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* LIVE OPS COLUMN */}
            <div className="lg:col-span-8 space-y-4">
              <div className="panel panel-glow-primary p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <h2 className="command-font text-2xl leading-none">Operação ao vivo</h2>
                  </div>
                  <span className="ops-font text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    atualiza a cada 5s
                  </span>
                </div>
                <div className="mt-4">
                  <LiveLog eventId={id} />
                </div>
              </div>

              <div className="panel p-5">
                <div className="flex items-center justify-between">
                  <h2 className="command-font text-2xl leading-none">Capacidade dos espaços</h2>
                  {full > 0 && (
                    <span className="ops-font text-[10px] uppercase tracking-[0.24em] text-amber-400">
                      alerta
                    </span>
                  )}
                </div>
                {!summaryQ.data || summaryQ.data.spaces.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    Nenhum espaço cadastrado.
                  </div>
                ) : (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {summaryQ.data.spaces.map((s) => {
                      const pct = s.capacity > 0 ? Math.min(100, (s.occupied / s.capacity) * 100) : 0;
                      const isFull = s.capacity > 0 && s.occupied >= s.capacity;
                      const bar = isFull
                        ? "bg-amber-500"
                        : pct > 75
                          ? "bg-[color:var(--violet)]"
                          : "bg-primary";
                      return (
                        <li key={s.id} className="rounded-lg border border-border/80 bg-background/40 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="ops-font truncate text-sm font-semibold">
                              {s.name}
                            </span>
                            <span
                              className={`command-font shrink-0 text-lg leading-none tabular-nums ${
                                isFull ? "text-amber-400" : "text-foreground"
                              }`}
                            >
                              {s.occupied}
                              <span className="text-muted-foreground">/{s.capacity || "—"}</span>
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                            <div className={`h-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* GROWTH COLUMN */}
            <div className="lg:col-span-4 space-y-4">
              <div className="panel panel-glow-violet p-5">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-[color:var(--violet)]" />
                  <h2 className="command-font text-2xl leading-none">Ranking promoters</h2>
                </div>
                {growthQ.isLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
                  </div>
                ) : !growthQ.data?.ranking.length ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Nenhum promoter com leads.
                  </p>
                ) : (
                  <ol className="mt-4 space-y-2">
                    {growthQ.data.ranking.map((p, i) => {
                      const top = i < 3;
                      const medal = ["1º", "2º", "3º"][i] ?? `${i + 1}º`;
                      return (
                        <li
                          key={p.id}
                          className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                            top
                              ? "border-[color-mix(in_oklab,var(--violet)_35%,transparent)] bg-[color-mix(in_oklab,var(--violet)_8%,transparent)]"
                              : "border-border bg-background/40"
                          }`}
                        >
                          <span
                            className={`command-font w-8 shrink-0 text-center text-lg leading-none ${
                              top ? "text-[color:var(--violet)]" : "text-muted-foreground"
                            }`}
                          >
                            {medal}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="ops-font truncate text-sm font-semibold">
                              {p.name}
                            </div>
                            <div className="ops-font mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                              {p.code} · {p.rate.toFixed(0)}% conv.
                            </div>
                          </div>
                          <div className="command-font shrink-0 text-xl leading-none tabular-nums">
                            {p.leads}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <Link
                  to="/admin/eventos/$id/promoters"
                  params={{ id }}
                  className="ops-font mt-3 inline-flex text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--violet)] hover:opacity-80"
                >
                  Ver todos →
                </Link>
              </div>

              <div className="panel p-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="command-font text-2xl leading-none">Origem de tráfego</h2>
                </div>
                <div className="mt-4 space-y-2">
                  {(
                    [
                      ["roxou", "Roxou"],
                      ["promoter", "Promoter"],
                      ["direct", "Direto"],
                      ["instagram", "Instagram"],
                      ["other", "Outro"],
                    ] as const
                  ).map(([key, label]) => {
                    const count = bySource[key] ?? 0;
                    const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="ops-font flex items-baseline justify-between text-xs">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="tabular-nums">
                            <span className="font-semibold text-foreground">{count}</span>{" "}
                            <span className="text-muted-foreground">({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-muted/60">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {totalLeads === 0 && (
                    <p className="text-xs text-muted-foreground">Sem leads ainda.</p>
                  )}
                </div>
              </div>

              <div className="panel p-5">
                <h2 className="command-font text-2xl leading-none">Governança</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MicroStat
                    icon={<Ticket className="h-3.5 w-3.5" />}
                    label="Convites"
                    value={summaryQ.data?.invitesActive}
                  />
                  <MicroStat
                    icon={<ShieldCheck className="h-3.5 w-3.5" />}
                    label="Credenciais"
                    value={summaryQ.data?.credentialsActive}
                  />
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function HeroCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number | undefined;
  tone: "allow" | "deny" | "info" | "growth";
  icon?: React.ReactNode;
}) {
  const toneMap = {
    allow: {
      accent: "text-[color:var(--live)]",
      ring: "ring-[color-mix(in_oklab,var(--live)_35%,transparent)]",
      bg: "bg-[color-mix(in_oklab,var(--live)_10%,transparent)]",
    },
    deny: {
      accent: "text-destructive",
      ring: "ring-destructive/40",
      bg: "bg-destructive/10",
    },
    info: {
      accent: "text-foreground",
      ring: "ring-border-strong",
      bg: "bg-background/40",
    },
    growth: {
      accent: "text-[color:var(--violet)]",
      ring: "ring-[color-mix(in_oklab,var(--violet)_35%,transparent)]",
      bg: "bg-[color-mix(in_oklab,var(--violet)_8%,transparent)]",
    },
  }[tone];

  return (
    <div className={`panel p-4 md:p-5 ring-1 ${toneMap.ring}`}>
      <div className="ops-font flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${toneMap.bg} ${toneMap.accent}`}>
          {icon}
        </span>
        {label}
      </div>
      <div className={`hero-number mt-3 ${toneMap.accent}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function MicroStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="ops-font flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="command-font mt-1 text-2xl leading-none tabular-nums">
        {value ?? "—"}
      </div>
    </div>
  );
}
