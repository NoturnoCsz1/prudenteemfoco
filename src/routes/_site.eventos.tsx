import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ArrowRight, MapPin } from "lucide-react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPublishedEvents, type PublicEvent } from "@/lib/events.functions";
import { formatEventDateEditorial, normalizeCoverUrl } from "@/lib/events";

const eventsQueryOptions = queryOptions({
  queryKey: ["public", "events", "list"],
  queryFn: () => listPublishedEvents(),
});

export const Route = createFileRoute("/_site/eventos")({
  head: () => ({
    meta: [
      { title: "Agenda — Prudente em Foco" },
      {
        name: "description",
        content:
          "Agenda oficial de festivais, shows e eventos da Prudente em Foco em Presidente Prudente.",
      },
      { property: "og:title", content: "Agenda — Prudente em Foco" },
      {
        property: "og:description",
        content:
          "Agenda oficial de festivais, shows e eventos da Prudente em Foco.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/eventos" },
    ],
    links: [{ rel: "canonical", href: "/eventos" }],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(eventsQueryOptions),
  component: EventosPage,
  errorComponent: ({ error }) => (
    <section className="container-page py-16">
      <p className="text-sm text-destructive">{error.message}</p>
    </section>
  ),
});

function isUpcoming(ev: PublicEvent): boolean {
  if (!ev.starts_at) return true;
  const start = Date.parse(ev.starts_at);
  if (Number.isNaN(start)) return true;
  return start >= Date.now() - 6 * 60 * 60 * 1000;
}

function EventosPage() {
  const { data: events } = useSuspenseQuery(eventsQueryOptions);
  const upcoming = events
    .filter(isUpcoming)
    .sort((a, b) =>
      (a.starts_at ? Date.parse(a.starts_at) : Infinity) -
      (b.starts_at ? Date.parse(b.starts_at) : Infinity),
    );

  return (
    <>
      <section>
        <div className="container-page pb-8 pt-24 md:pb-12 md:pt-32">
          <p className="eyebrow-label text-primary">Agenda oficial</p>
          <h1 className="mt-6 display-xl text-foreground">Programação.</h1>
          <p className="mt-8 max-w-xl font-display text-lg leading-snug text-foreground/85 md:text-2xl">
            Cada evento aparece aqui quando confirmado. Sem especulação.
          </p>
        </div>
      </section>

      <section>
        <div className="container-page pb-32">
          {upcoming.length === 0 ? (
            <div className="border-y border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] py-24 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-6 font-display text-sm font-bold uppercase tracking-[0.28em] text-foreground">
                Nenhum evento publicado no momento
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Novas datas aparecem aqui assim que forem confirmadas.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[color-mix(in_oklab,var(--foreground)_12%,transparent)] border-y border-[color-mix(in_oklab,var(--foreground)_12%,transparent)]">
              {upcoming.map((ev) => (
                <EventRow key={ev.slug} event={ev} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function EventRow({ event }: { event: PublicEvent }) {
  const cover = normalizeCoverUrl(event.cover_image_url);
  return (
    <li>
      <Link
        to="/eventos/$slug"
        params={{ slug: event.slug }}
        className="group grid gap-4 py-10 md:grid-cols-[minmax(0,1fr),1.6fr] md:items-center md:gap-12 md:py-16"
      >
        <div className="order-2 md:order-1">
          <p className="date-block text-3xl text-primary md:text-4xl">
            {formatEventDateEditorial(event.starts_at, event.ends_at)}
          </p>
          <h2 className="mt-3 poster text-3xl text-foreground transition-colors group-hover:text-primary md:text-6xl">
            {event.title}
          </h2>
          {(event.venue_name || event.city) && (
            <p className="mt-4 flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground md:text-xs">
              <MapPin className="h-3.5 w-3.5" />
              {[event.venue_name, event.city].filter(Boolean).join(" · ")}
            </p>
          )}
          <span className="mt-6 inline-flex items-center gap-2 border-b border-foreground/40 pb-1 font-display text-xs font-bold uppercase tracking-[0.28em] text-foreground group-hover:border-primary group-hover:text-primary">
            Ver evento <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="order-1 md:order-2">
          {cover ? (
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
              <img
                src={cover}
                alt=""
                loading="lazy"
                className="image-zoom h-full w-full object-cover"
              />
            </div>
          ) : (
            <div
              className="flex aspect-[16/10] w-full flex-col justify-between p-6 md:p-10"
              style={{
                background:
                  "radial-gradient(120% 90% at 0% 0%, color-mix(in oklab, var(--primary) 20%, transparent) 0%, transparent 55%), linear-gradient(180deg, color-mix(in oklab, var(--foreground) 4%, var(--background)) 0%, var(--background) 100%)",
              }}
            >
              <p className="eyebrow-label text-primary">Prudente em Foco</p>
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Imagem oficial em breve
              </p>
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}
