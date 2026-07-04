import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Sparkles,
  Music2,
  Trophy,
  Building2,
  History,
  Handshake,
} from "lucide-react";
import { listPublishedEvents, type PublicEvent } from "@/lib/events.functions";
import { formatEventDateRange } from "@/lib/events";

const eventsQueryOptions = queryOptions({
  queryKey: ["public", "events", "list"],
  queryFn: () => listPublishedEvents(),
});

export const Route = createFileRoute("/_site/")({
  head: () => ({
    meta: [
      { title: "Prudente em Foco — Eventos, festivais e experiências" },
      {
        name: "description",
        content:
          "A plataforma oficial da Prudente em Foco: festivais, shows, rodeios e experiências produzidos com identidade, memória e operação profissional.",
      },
      {
        property: "og:title",
        content: "Prudente em Foco — Eventos, festivais e experiências",
      },
      {
        property: "og:description",
        content:
          "Festivais, shows, rodeios e experiências com identidade própria.",
      },
      { property: "og:type", content: "website" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQueryOptions),
  component: HomePage,
});

function isFestival(ev: PublicEvent): boolean {
  // Heurística estrutural: eventos com duração >= 24h são tratados como
  // festivais/grandes eventos. Nada inventado — apenas leitura das datas.
  if (!ev.starts_at || !ev.ends_at) return false;
  const start = Date.parse(ev.starts_at);
  const end = Date.parse(ev.ends_at);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return end - start >= 24 * 60 * 60 * 1000;
}

function isUpcoming(ev: PublicEvent): boolean {
  if (!ev.starts_at) return true;
  const start = Date.parse(ev.starts_at);
  if (Number.isNaN(start)) return true;
  return start >= Date.now() - 6 * 60 * 60 * 1000;
}

function HomePage() {
  const { data: events } = useSuspenseQuery(eventsQueryOptions);

  const upcoming = events.filter(isUpcoming).sort((a, b) => {
    const ax = a.starts_at ? Date.parse(a.starts_at) : Infinity;
    const bx = b.starts_at ? Date.parse(b.starts_at) : Infinity;
    return ax - bx;
  });
  const festivals = upcoming.filter(isFestival);
  const shows = upcoming.filter((ev) => !isFestival(ev));
  const featured = upcoming[0] ?? null;
  const past = events.filter((ev) => !isUpcoming(ev));

  return (
    <>
      {/* HERO EDITORIAL */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(65% 55% at 20% 0%, color-mix(in oklab, var(--primary) 22%, transparent) 0%, transparent 60%), radial-gradient(45% 40% at 90% 15%, color-mix(in oklab, var(--gold) 15%, transparent) 0%, transparent 65%)",
          }}
        />
        <div className="container-page py-16 md:py-28">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-primary">
            Prudente em Foco · 2026 / 2027
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-5xl font-black leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
            Onde a cidade
            <br />
            <span className="text-primary">vira palco.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base text-muted-foreground md:text-lg">
            Produzimos festivais, shows, rodeios e experiências com identidade
            própria. Cada evento é operado com método, memória e cuidado com o
            público.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/eventos"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Ver agenda oficial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contato"
              className="inline-flex items-center rounded-md border border-border-strong px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Fale com a produção
            </Link>
          </div>

          {/* Métricas estruturais — só exibidas quando há conteúdo real */}
          {events.length > 0 && (
            <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-6 border-t border-border pt-8 md:grid-cols-4">
              <Metric label="Eventos publicados" value={events.length} />
              <Metric label="Próximos" value={upcoming.length} />
              <Metric label="Grandes eventos" value={festivals.length} />
              <Metric label="Shows e avulsos" value={shows.length} />
            </dl>
          )}
        </div>
      </section>

      {/* PRÓXIMOS EVENTOS — DESTAQUE */}
      {featured && (
        <section className="border-b border-border">
          <div className="container-page py-16 md:py-20">
            <SectionHeader
              eyebrow="Próximo em cartaz"
              title="O próximo capítulo da agenda"
            />
            <FeaturedEventCard event={featured} />
          </div>
        </section>
      )}

      {/* FESTIVAIS E GRANDES EVENTOS */}
      <section className="border-b border-border bg-surface/30">
        <div className="container-page py-16 md:py-20">
          <SectionHeader
            eyebrow="Festivais e grandes eventos"
            title="Marcas próprias, calendário próprio."
            icon={<Trophy className="h-5 w-5" />}
            description="Eventos recorrentes de larga escala produzidos pela Prudente em Foco — como o Prudente Rodeo Bulls, a Expo Prudente e o Prudente Rock Festival — publicados aqui quando cada edição é oficializada."
          />
          {festivals.length === 0 ? (
            <EmptyBlock
              icon={<Trophy className="h-5 w-5" />}
              title="Nenhum grande evento publicado no momento"
              description="As próximas edições dos festivais e grandes eventos aparecerão aqui assim que forem oficializadas."
            />
          ) : (
            <ul className="mt-10 grid gap-5 md:grid-cols-2">
              {festivals.map((ev) => (
                <EventCard key={ev.slug} event={ev} variant="large" />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* SHOWS E EVENTOS AVULSOS */}
      <section className="border-b border-border">
        <div className="container-page py-16 md:py-20">
          <SectionHeader
            eyebrow="Shows e eventos avulsos"
            title="Noites únicas, apresentações pontuais."
            icon={<Music2 className="h-5 w-5" />}
            description="Shows, apresentações e datas especiais — eventos que não fazem parte de uma marca recorrente, mas passam pela mesma operação profissional."
          />
          {shows.length === 0 ? (
            <EmptyBlock
              icon={<Music2 className="h-5 w-5" />}
              title="Nenhum show avulso publicado no momento"
              description="Novas datas serão publicadas aqui quando confirmadas."
            />
          ) : (
            <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {shows.map((ev) => (
                <EventCard key={ev.slug} event={ev} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* EXPERIÊNCIAS */}
      <section className="border-b border-border bg-surface/30">
        <div className="container-page py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
            <SectionHeader
              eyebrow="Experiências"
              title="Formatos curados, para além do palco."
              icon={<Sparkles className="h-5 w-5" />}
              description="Encontros, bastidores e vivências que ampliam a relação da marca com o público. Um catálogo curado será publicado em fase própria."
            />
            <Link
              to="/experiencias"
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border-strong px-5 py-3 text-sm font-medium hover:bg-accent"
            >
              Ver experiências <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* MEMÓRIA / MURAL */}
      <section className="border-b border-border">
        <div className="container-page py-16 md:py-20">
          <SectionHeader
            eyebrow="Mural da Prudente em Foco"
            title="Memória dos eventos realizados."
            icon={<History className="h-5 w-5" />}
            description="Guardamos a trajetória de cada edição — o que aconteceu importa tanto quanto o que virá."
          />
          {past.length === 0 ? (
            <EmptyBlock
              icon={<History className="h-5 w-5" />}
              title="O mural será publicado em breve"
              description="Assim que as primeiras edições registradas forem oficializadas, aparecerão nesta linha do tempo."
            />
          ) : (
            <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {past.slice(0, 6).map((ev) => (
                <li key={ev.slug}>
                  <Link
                    to="/eventos/$slug"
                    params={{ slug: ev.slug }}
                    className="group block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong"
                  >
                    <p className="font-display text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
                      Edição realizada
                    </p>
                    <h3 className="mt-2 font-display text-lg font-semibold leading-tight">
                      {ev.title}
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatEventDateRange(ev.starts_at, ev.ends_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* EMPRESA E PARCEIROS */}
      <section className="border-b border-border bg-surface/30">
        <div className="container-page py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-start">
            <div>
              <SectionHeader
                eyebrow="A empresa"
                title="Prudente em Foco produz seus próprios eventos."
                icon={<Building2 className="h-5 w-5" />}
                description="Somos a organização por trás das marcas Prudente Rodeo Bulls, Expo Prudente e Prudente Rock Festival — além de shows e experiências pontuais. Operação, curadoria e produção sob a mesma casa."
              />
              <Link
                to="/sobre"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Conheça a empresa <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
              <div className="flex items-center gap-2 text-primary">
                <Handshake className="h-5 w-5" />
                <span className="font-display text-[11px] uppercase tracking-[0.3em]">
                  Parceiros
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold leading-tight">
                Marcas e parceiros institucionais serão publicados em fase
                própria.
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Para propostas de patrocínio, ativação de marca ou parceria de
                mídia, fale diretamente com a produção.
              </p>
              <Link
                to="/contato"
                className="mt-6 inline-flex items-center gap-2 rounded-md border border-border-strong px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Falar com a produção <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section>
        <div className="container-page py-20 text-center md:py-28">
          <p className="font-display text-[11px] uppercase tracking-[0.4em] text-primary">
            Agenda oficial
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
            Conheça todos os eventos da Prudente em Foco.
          </h2>
          <div className="mt-10">
            <Link
              to="/eventos"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Ver todos os eventos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <p className="font-display text-[11px] uppercase tracking-[0.35em]">
          {eyebrow}
        </p>
      </div>
      <h2 className="mt-4 font-display text-3xl font-black leading-[1.05] tracking-tight md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-sm text-muted-foreground md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-4xl font-black tabular-nums text-foreground md:text-5xl">
        {value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function EmptyBlock({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-border-strong bg-background p-10 text-center">
      {icon && (
        <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

function FeaturedEventCard({ event }: { event: PublicEvent }) {
  return (
    <Link
      to="/eventos/$slug"
      params={{ slug: event.slug }}
      className="group mt-10 grid overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-primary/40 md:grid-cols-[1.4fr_1fr]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted md:aspect-auto">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <CalendarDays className="h-16 w-16" />
          </div>
        )}
      </div>
      <div className="flex flex-col justify-between gap-6 p-6 md:p-10">
        <div>
          <p className="font-display text-[11px] uppercase tracking-[0.3em] text-primary">
            {formatEventDateRange(event.starts_at, event.ends_at)}
          </p>
          <h3 className="mt-4 font-display text-3xl font-black leading-[1.05] tracking-tight md:text-4xl">
            {event.title}
          </h3>
          {(event.venue_name || event.city) && (
            <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {[event.venue_name, event.city].filter(Boolean).join(", ")}
            </p>
          )}
          {event.short_description && (
            <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">
              {event.short_description}
            </p>
          )}
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          Ver detalhes do evento <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function EventCard({
  event,
  variant = "default",
}: {
  event: PublicEvent;
  variant?: "default" | "large";
}) {
  return (
    <li>
      <Link
        to="/eventos/$slug"
        params={{ slug: event.slug }}
        className="group block h-full overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-primary/40"
      >
        <div
          className={`w-full overflow-hidden bg-muted ${variant === "large" ? "aspect-[16/9]" : "aspect-[16/10]"}`}
        >
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <CalendarDays className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="p-5 md:p-6">
          <p className="font-display text-[10px] uppercase tracking-[0.3em] text-primary">
            {formatEventDateRange(event.starts_at, event.ends_at)}
          </p>
          <h3
            className={`mt-2 font-display font-semibold leading-tight ${
              variant === "large" ? "text-2xl md:text-3xl" : "text-xl"
            }`}
          >
            {event.title}
          </h3>
          {(event.venue_name || event.city) && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {[event.venue_name, event.city].filter(Boolean).join(", ")}
            </p>
          )}
          {event.short_description && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {event.short_description}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
