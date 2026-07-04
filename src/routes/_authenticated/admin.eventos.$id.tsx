import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CircleDot,
  Loader2,
  MapPin,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import { LiveLog } from "@/components/admin/LiveLog";

export const Route = createFileRoute("/_authenticated/admin/eventos/$id")({
  head: () => ({
    meta: [
      { title: "Visão Geral — Admin · Prudente em Foco" },
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
            .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
          supabase
            .from("access_attempts")
            .select("id", { count: "exact", head: true })
            .eq("event_id", id)
            .eq("status", "denied")
            .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
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

  const now = new Date();
  const ev = eventQ.data;
  const start = ev?.starts_at ? new Date(ev.starts_at) : null;
  const end = ev?.ends_at ? new Date(ev.ends_at) : null;
  const isLive = start && end && start <= now && now <= end;
  const isPast = end && end < now;
  const life = isLive ? "AO VIVO" : isPast ? "ENCERRADO" : "FUTURO";
  const lifeTone = isLive
    ? "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30"
    : isPast
      ? "bg-muted text-muted-foreground ring-border"
      : "bg-primary/15 text-primary ring-primary/30";

  const full = summaryQ.data?.spaces.filter(
    (s) => s.capacity > 0 && s.occupied >= s.capacity,
  ).length ?? 0;

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
          <section className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${lifeTone}`}
            >
              {isLive && <CircleDot className="h-3 w-3 animate-pulse" />} {life}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {start
                ? start.toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "Sem data"}
            </span>
            {(ev.venue_name || ev.city) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[ev.venue_name, ev.city].filter(Boolean).join(" · ")}
              </span>
            )}
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Entradas hoje" value={summaryQ.data?.allowedToday} tone="allow" />
            <StatCard label="Negadas hoje" value={summaryQ.data?.deniedToday} tone="deny" />
            <StatCard
              label="Convites ativos"
              value={summaryQ.data?.invitesActive}
              icon={<Ticket className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Credenciais ativas"
              value={summaryQ.data?.credentialsActive}
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
            />
          </section>

          <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Ocupação dos espaços
                </h2>
                {full > 0 && (
                  <span className="text-xs text-amber-500">
                    {full} lotado{full > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {!summaryQ.data || summaryQ.data.spaces.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Nenhum espaço cadastrado.
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {summaryQ.data.spaces.map((s) => {
                    const pct = s.capacity > 0 ? Math.min(100, (s.occupied / s.capacity) * 100) : 0;
                    const isFull = s.capacity > 0 && s.occupied >= s.capacity;
                    return (
                      <li
                        key={s.id}
                        className="rounded-lg border border-border bg-card p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{s.name}</span>
                          <span
                            className={`text-xs tabular-nums ${
                              isFull
                                ? "text-amber-500 font-semibold"
                                : "text-muted-foreground"
                            }`}
                          >
                            {s.occupied}/{s.capacity || "—"}
                            {isFull ? " · lotado" : ""}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all ${
                              isFull ? "bg-amber-500" : "bg-primary"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Log ao vivo
              </h2>
              <div className="mt-3">
                <LiveLog eventId={id} />
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number | undefined;
  tone?: "allow" | "deny";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "allow"
      ? "text-emerald-500"
      : tone === "deny"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-2 font-display text-2xl font-semibold ${toneClass}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}
