import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CircleDot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Painel · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

type EventRow = {
  id: string;
  title: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  city: string | null;
};

type LifeStatus = "live" | "upcoming" | "past";

function lifeStatus(e: EventRow, now: Date): LifeStatus {
  const s = e.starts_at ? new Date(e.starts_at) : null;
  const en = e.ends_at ? new Date(e.ends_at) : null;
  if (s && en && s <= now && now <= en) return "live";
  if (s && s > now) return "upcoming";
  if (en && en < now) return "past";
  if (s && s <= now) return "live";
  return "upcoming";
}

const LIFE_LABEL: Record<LifeStatus, string> = {
  live: "AO VIVO",
  upcoming: "FUTURO",
  past: "ENCERRADO",
};
const LIFE_TONE: Record<LifeStatus, string> = {
  live: "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30",
  upcoming: "bg-primary/15 text-primary ring-primary/30",
  past: "bg-muted text-muted-foreground ring-border",
};

function AdminDashboard() {
  const eventsQ = useQuery({
    queryKey: ["admin", "dashboard", "events"],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, status, starts_at, ends_at, venue_name, city")
        .order("starts_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
    refetchInterval: 15000,
  });

  const statsQ = useQuery({
    queryKey: ["admin", "dashboard", "stats"],
    queryFn: async () => {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const iso = dayStart.toISOString();
      const [allowed, denied, sessions] = await Promise.all([
        supabase
          .from("access_attempts")
          .select("id", { count: "exact", head: true })
          .eq("status", "allowed")
          .gte("created_at", iso),
        supabase
          .from("access_attempts")
          .select("id", { count: "exact", head: true })
          .eq("status", "denied")
          .gte("created_at", iso),
        supabase
          .from("access_sessions")
          .select("space_id", { count: "exact", head: true })
          .eq("status", "active"),
      ]);
      return {
        allowedToday: allowed.count ?? 0,
        deniedToday: denied.count ?? 0,
        activeSessions: sessions.count ?? 0,
      };
    },
    refetchInterval: 10000,
  });

  const now = new Date();

  return (
    <div className="p-5 md:p-8">
      <AdminPageHeader
        title="Painel operacional"
        description="Visão consolidada dos eventos, entradas e ocupação em tempo real."
      />

      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Entradas hoje" value={statsQ.data?.allowedToday} tone="allow" />
        <StatCard label="Negadas hoje" value={statsQ.data?.deniedToday} tone="deny" />
        <StatCard label="Sessões ativas" value={statsQ.data?.activeSessions} tone="live" />
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Eventos
          </h2>
          <Link
            to="/admin/eventos"
            className="text-xs text-primary hover:underline"
          >
            Gerenciar todos →
          </Link>
        </div>

        {eventsQ.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !eventsQ.data || eventsQ.data.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum evento ainda.{" "}
            <Link to="/admin/eventos/novo" className="text-primary underline">
              Criar o primeiro
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {eventsQ.data.map((e) => {
              const ls = lifeStatus(e, now);
              return (
                <li key={e.id}>
                  <Link
                    to="/admin/eventos/$id"
                    params={{ id: e.id }}
                    className="group flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {e.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {e.starts_at
                            ? new Date(e.starts_at).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "Sem data"}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${LIFE_TONE[ls]}`}
                      >
                        {ls === "live" && (
                          <CircleDot className="h-3 w-3 animate-pulse" />
                        )}
                        {LIFE_LABEL[ls]}
                      </span>
                    </div>
                    {(e.venue_name || e.city) && (
                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        {[e.venue_name, e.city].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | undefined;
  tone: "allow" | "deny" | "live";
}) {
  const toneClass =
    tone === "allow"
      ? "text-emerald-500"
      : tone === "deny"
        ? "text-destructive"
        : "text-primary";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-2 font-display text-3xl font-semibold ${toneClass}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}
