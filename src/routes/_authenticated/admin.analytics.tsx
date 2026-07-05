import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Eye, MousePointerClick, Ticket, Newspaper, Sparkles, Loader2, Home, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAnalytics,
});

type Totals = {
  site_visits: number;
  eventos_list_views: number;
  home_views: number;
  home_cta_clicks: number;
  news_clicks: number;
  experience_clicks: number;
  ticket_clicks: number;
  event_page_views: number;
  total_events_tracked: number;
};

type TopEvent = {
  event_id: string;
  title: string;
  slug: string;
  views: number;
  cta_clicks: number;
  ticket_clicks: number;
  total: number;
};

type AnalyticsResponse = { totals: Totals; top_events: TopEvent[] };

type Period = "today" | "7d" | "30d";

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
];

function periodRange(p: Period): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (p === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (p === "7d") {
    from.setDate(from.getDate() - 7);
  } else {
    from.setDate(from.getDate() - 30);
  }
  return { from, to };
}

function AdminAnalytics() {
  const [period, setPeriod] = useState<Period>("7d");
  const { from, to } = useMemo(() => periodRange(period), [period]);

  const q = useQuery({
    queryKey: ["admin", "analytics", period],
    queryFn: async (): Promise<AnalyticsResponse> => {
      const { data, error } = await supabase.rpc("admin_site_analytics", {
        _from: from.toISOString(),
        _to: to.toISOString(),
      });
      if (error) throw error;
      return (data as unknown) as AnalyticsResponse;
    },
    staleTime: 30_000,
  });

  const totals = q.data?.totals;
  const top = q.data?.top_events ?? [];

  return (
    <div className="p-5 md:p-8">
      <AdminPageHeader
        title="Analytics"
        description="Métricas públicas do site e dos eventos. Dados agregados, sem informações pessoais."
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
              period === p.id
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card text-muted-foreground ring-border hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {q.isError ? (
        <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar os dados. Tente novamente em instantes.
        </div>
      ) : null}

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4">
        <MetricCard
          label="Visitas à Home"
          value={totals?.site_visits}
          icon={<Home className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <MetricCard
          label="Visitas à /eventos"
          value={totals?.eventos_list_views}
          icon={<CalendarDays className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <MetricCard
          label="Página do evento · views"
          value={totals?.event_page_views}
          icon={<BarChart3 className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <MetricCard
          label="Home · Ver evento"
          value={totals?.home_cta_clicks}
          icon={<MousePointerClick className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <MetricCard
          label="Ingressos · cliques"
          value={totals?.ticket_clicks}
          icon={<Ticket className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <MetricCard
          label="Hero · impressões"
          value={totals?.home_views}
          icon={<Eye className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <MetricCard
          label="Notícias · cliques"
          value={totals?.news_clicks}
          icon={<Newspaper className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <MetricCard
          label="Experiências · cliques"
          value={totals?.experience_clicks}
          icon={<Sparkles className="h-4 w-4" />}
          loading={q.isLoading}
        />

        <MetricCard
          label="Home · Ver evento"
          value={totals?.home_cta_clicks}
          icon={<MousePointerClick className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <MetricCard
          label="Página do evento · views"
          value={totals?.event_page_views}
          icon={<BarChart3 className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <MetricCard
          label="Ingressos · cliques"
          value={totals?.ticket_clicks}
          icon={<Ticket className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <MetricCard
          label="Notícias · cliques"
          value={totals?.news_clicks}
          icon={<Newspaper className="h-4 w-4" />}
          loading={q.isLoading}
        />
        <MetricCard
          label="Experiências · cliques"
          value={totals?.experience_clicks}
          icon={<Sparkles className="h-4 w-4" />}
          loading={q.isLoading}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Eventos mais acessados
        </h2>

        {q.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : top.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Ainda não há dados neste período. Assim que o público interagir com o site, as métricas aparecem aqui.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {top.map((e, i) => (
              <li key={e.event_id} className="flex items-center gap-3 p-3 md:p-4">
                <div className="w-6 shrink-0 text-center text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/eventos/$slug"
                    params={{ slug: e.slug }}
                    className="block truncate text-sm font-semibold hover:underline"
                  >
                    {e.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{e.views} views</span>
                    <span>{e.cta_clicks} “Ver evento”</span>
                    <span>{e.ticket_clicks} ingressos</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-lg font-semibold">{e.total}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    interações
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        Métricas agregadas a partir dos eventos de interação do site (sem cookies, sem dados pessoais).
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-semibold md:text-3xl">
        {loading ? "…" : (value ?? 0).toLocaleString("pt-BR")}
      </div>
    </div>
  );
}
