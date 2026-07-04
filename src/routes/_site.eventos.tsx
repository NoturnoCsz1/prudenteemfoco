import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, MapPin } from "lucide-react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { PageHero } from "@/components/site/PageHero";
import { EmptyState } from "@/components/site/EmptyState";
import { listPublishedEvents, type PublicEvent } from "@/lib/events.functions";
import { formatEventDateRange } from "@/lib/events";

const eventsQueryOptions = queryOptions({
  queryKey: ["public", "events", "list"],
  queryFn: () => listPublishedEvents(),
});

export const Route = createFileRoute("/_site/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos — Prudente em Foco" },
      {
        name: "description",
        content:
          "Agenda oficial dos eventos institucionais da Prudente em Foco.",
      },
      { property: "og:title", content: "Eventos — Prudente em Foco" },
      {
        property: "og:description",
        content: "Agenda oficial dos eventos institucionais da Prudente em Foco.",
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
  notFoundComponent: () => (
    <section className="container-page py-16">
      <p className="text-sm text-muted-foreground">Página não encontrada.</p>
    </section>
  ),
});

function EventosPage() {
  const { data: events } = useSuspenseQuery(eventsQueryOptions);

  return (
    <>
      <PageHero
        eyebrow="Eventos"
        title="Agenda oficial Prudente em Foco"
        description="Publicamos aqui apenas eventos oficialmente confirmados. Nada de conteúdo especulativo — cada evento é verificado antes de ir ao ar."
      />
      <section className="container-page pb-20">
        {events.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="Nenhum evento publicado no momento"
            description="Assim que novos eventos forem oficializados, aparecerão nesta agenda. Volte em breve."
          />
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (
              <EventCard key={ev.slug} event={ev} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function EventCard({ event }: { event: PublicEvent }) {
  return (
    <li>
      <Link
        to="/eventos/$slug"
        params={{ slug: event.slug }}
        className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-primary/40"
      >
        <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
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
        <div className="p-5">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-primary">
            {formatEventDateRange(event.starts_at, event.ends_at)}
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold leading-tight">
            {event.title}
          </h3>
          {(event.venue_name || event.city) && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {[event.venue_name, event.city].filter(Boolean).join(", ")}
            </p>
          )}
          {event.short_description && (
            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
              {event.short_description}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
