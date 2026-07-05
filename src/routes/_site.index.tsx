import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery, useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import {
  listPublishedEvents,
  listCommercialLinksBySlug,
  type PublicEvent,
} from "@/lib/events.functions";
import {
  listHomeFeaturedEvents,
  listHomeNews,
  listHomeExperiences,
  type HomeFeaturedEvent,
  type HomeNewsItem,
  type HomeExperience,
} from "@/lib/home.functions";
import {
  formatEventDateEditorial,
  normalizeCoverUrl,
  type EventKind,
  EVENT_KIND_LABEL,
} from "@/lib/events";
import {
  HeroCarousel,
  resolveHeroSecondaryCta,
  type HeroSlide,
} from "@/components/site/HeroCarousel";
import { useAttribution, buildSearch } from "@/lib/attribution";
import { trackHomeEvent, trackSiteEvent } from "@/lib/home-tracking";
import { getSiteHome, listSiteMemoryItems, type SiteHome, type SiteMemoryItem } from "@/lib/site.functions";

const eventsQO = queryOptions({
  queryKey: ["public", "events", "list"],
  queryFn: () => listPublishedEvents(),
});
const featuredQO = queryOptions({
  queryKey: ["public", "home", "featured"],
  queryFn: () => listHomeFeaturedEvents(),
});
const newsQO = queryOptions({
  queryKey: ["public", "home", "news"],
  queryFn: () => listHomeNews({ data: { limit: 6 } }),
});
const experiencesQO = queryOptions({
  queryKey: ["public", "home", "experiences"],
  queryFn: () => listHomeExperiences({ data: { limit: 4 } }),
});
const siteHomeQO = queryOptions({
  queryKey: ["site", "home"],
  queryFn: () => getSiteHome(),
  staleTime: 60_000,
});
const siteMemoryQO = queryOptions({
  queryKey: ["site", "memory"],
  queryFn: () => listSiteMemoryItems(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_site/")({
  head: () => ({
    meta: [
      { title: "Prudente em Foco — Eventos, festivais e experiências" },
      {
        name: "description",
        content:
          "Produtora de festivais, shows, rodeios e experiências em Presidente Prudente. Programação oficial, memória e experiências exclusivas.",
      },
      { property: "og:title", content: "Prudente em Foco — Eventos, festivais e experiências" },
      { property: "og:description", content: "Festivais, shows e experiências em Presidente Prudente." },
      { property: "og:type", content: "website" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(eventsQO);
    context.queryClient.ensureQueryData(featuredQO);
    context.queryClient.prefetchQuery(newsQO);
    context.queryClient.prefetchQuery(experiencesQO);
    context.queryClient.prefetchQuery(siteHomeQO);
    context.queryClient.prefetchQuery(siteMemoryQO);
  },
  component: HomePage,
});

function isUpcoming(ev: PublicEvent): boolean {
  if (!ev.starts_at) return true;
  const start = Date.parse(ev.starts_at);
  if (Number.isNaN(start)) return true;
  return start >= Date.now() - 6 * 60 * 60 * 1000;
}

function HomePage() {
  const { data: events } = useSuspenseQuery(eventsQO);
  const { data: featured } = useSuspenseQuery(featuredQO);
  const { data: news = [] } = useQuery(newsQO);
  const { data: experiences = [] } = useQuery(experiencesQO);
  const { data: siteHome } = useQuery(siteHomeQO);
  const { data: memoryItems = [] } = useQuery(siteMemoryQO);

  const attribution = useAttribution();
  const trackedRef = useRef(false);
  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackSiteEvent("home_page_view", attribution);
  }, [attribution]);


  const upcoming = useMemo(
    () =>
      events.filter(isUpcoming).sort((a, b) => {
        const ax = a.starts_at ? Date.parse(a.starts_at) : Infinity;
        const bx = b.starts_at ? Date.parse(b.starts_at) : Infinity;
        return ax - bx;
      }),
    [events],
  );
  const past = useMemo(() => events.filter((ev) => !isUpcoming(ev)), [events]);

  const heroSlugs = new Set(featured.map((f) => f.slug));
  const nextEvents = upcoming.filter((ev) => !heroSlugs.has(ev.slug));
  const nextEventsBalanced =
    nextEvents.length >= 3
      ? nextEvents
      : nextEvents.concat(upcoming.filter((e) => heroSlugs.has(e.slug))).filter(
          (e, i, a) => a.findIndex((x) => x.slug === e.slug) === i,
        );

  return (
    <>
      {featured.length > 0 ? (
        <HeroBlock featured={featured} eventsIndex={events} />
      ) : (
        <InstitutionalHero cms={siteHome ?? null} />
      )}

      {nextEventsBalanced.length > 0 && (
        <NextEventsSection events={nextEventsBalanced} />
      )}

      {news.length > 0 && <NewsSection items={news} />}

      {experiences.length > 0 && (
        <ExperiencesSection items={experiences} cms={siteHome ?? null} />
      )}

      {memoryItems.length > 0 ? (
        <CmsMemorySection items={memoryItems} />
      ) : (
        past.length > 0 && <MemorySection events={past.slice(0, 8)} />
      )}

      <FinalCTA cms={siteHome ?? null} />
    </>
  );
}

/* =============================== HERO ============================== */

function HeroBlock({
  featured,
  eventsIndex,
}: {
  featured: HomeFeaturedEvent[];
  eventsIndex: PublicEvent[];
}) {
  // Enriquecer featured com external_ticket_url legado a partir do evento pai.
  const enriched = featured.map((f) => {
    const parent = eventsIndex.find((e) => e.slug === f.slug);
    return { ...f, external_ticket_url: parent?.external_ticket_url ?? null };
  });
  return <HeroWithLinks featured={enriched} />;
}

function HeroWithLinks({
  featured,
}: {
  featured: (HomeFeaturedEvent & { external_ticket_url: string | null })[];
}) {
  const linkQueries = useQueries({
    queries: featured.map((f) => ({
      queryKey: ["public", "event", f.slug, "commercial-links"],
      queryFn: () => listCommercialLinksBySlug({ data: { slug: f.slug } }),
      staleTime: 60_000,
    })),
  });

  const slides: HeroSlide[] = featured.map((event, i) => ({
    event,
    secondaryCta: resolveHeroSecondaryCta(event, linkQueries[i]?.data),
  }));

  return <HeroCarousel slides={slides} />;
}

function InstitutionalHero({ cms }: { cms: SiteHome | null }) {
  const eyebrow = cms?.hero_eyebrow || "Prudente em Foco";
  const title = cms?.hero_title || "Onde a cidade\nvira palco.";
  const subtitle =
    cms?.hero_subtitle ||
    "Produtora de festivais, shows, rodeios e experiências em Presidente Prudente.";
  const primaryLabel = cms?.cta_primary_label || "Ver agenda";
  const primaryUrl = cms?.cta_primary_url || "";
  const secondaryLabel = cms?.cta_secondary_label || "Fale com a produção";
  const secondaryUrl = cms?.cta_secondary_url || "";

  return (
    <section className="relative isolate overflow-hidden -mt-14 md:-mt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 60% at 15% 100%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 60%)",
        }}
      />
      <div className="container-page flex min-h-[80svh] flex-col justify-end pb-14 pt-20 md:min-h-[80vh] md:pb-24 md:pt-40">
        <p className="eyebrow-label text-primary">{eyebrow}</p>
        <h1 className="mt-5 display-xl whitespace-pre-line text-foreground md:mt-6">
          {title}
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground md:mt-8 md:text-lg">
          {subtitle}
        </p>
        <div className="mt-8 flex flex-col items-stretch gap-3 md:mt-10 md:flex-row md:flex-wrap md:items-center md:gap-6">
          {primaryUrl ? (
            <a
              href={primaryUrl}
              className="inline-flex items-center justify-center gap-2 bg-foreground px-6 py-3.5 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-background hover:opacity-90 md:px-7 md:py-4 md:text-xs"
            >
              {primaryLabel} <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <Link
              to="/eventos"
              className="inline-flex items-center justify-center gap-2 bg-foreground px-6 py-3.5 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-background hover:opacity-90 md:px-7 md:py-4 md:text-xs"
            >
              {primaryLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {secondaryUrl ? (
            <a
              href={secondaryUrl}
              className="inline-flex items-center justify-center gap-2 border border-foreground/40 px-6 py-3.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground/90 hover:border-primary hover:text-primary md:border-0 md:border-b md:border-foreground/60 md:px-0 md:py-1 md:pb-1 md:text-xs"
            >
              {secondaryLabel}
            </a>
          ) : (
            <Link
              to="/contato"
              className="inline-flex items-center justify-center gap-2 border border-foreground/40 px-6 py-3.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground/90 hover:border-primary hover:text-primary md:border-0 md:border-b md:border-foreground/60 md:px-0 md:py-1 md:pb-1 md:text-xs"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/* =============================== PRÓXIMOS ============================== */

const CATEGORIES: (EventKind | "all")[] = [
  "all",
  "festival",
  "show",
  "special_event",
  "other",
];
const CAT_LABEL: Record<EventKind | "all", string> = {
  all: "Tudo",
  festival: EVENT_KIND_LABEL.festival,
  show: EVENT_KIND_LABEL.show,
  special_event: EVENT_KIND_LABEL.special_event,
  other: EVENT_KIND_LABEL.other,
};

function NextEventsSection({ events }: { events: PublicEvent[] }) {
  const [cat, setCat] = useState<EventKind | "all">("all");
  const filtered = cat === "all" ? events : events.filter((e) => e.kind === cat);
  const available = new Set(events.map((e) => e.kind));
  return (
    <section>
      <div className="container-page py-10 md:py-24">
        <div className="max-w-4xl">
          <p className="eyebrow-label text-primary">Próximos eventos</p>
          <h2 className="mt-4 section-title text-foreground">Agenda oficial.</h2>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground md:mt-6 md:text-base">
            Shows, festivais e experiências confirmados em Presidente Prudente.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 md:mt-10">
          {CATEGORIES.filter((c) => c === "all" || available.has(c as EventKind)).map(
            (c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`border px-4 py-2 font-display text-[10px] font-bold uppercase tracking-[0.24em] transition-colors md:text-xs ${
                  cat === c
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/25 text-foreground/80 hover:border-foreground/60 hover:text-foreground"
                }`}
              >
                {CAT_LABEL[c]}
              </button>
            ),
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="mt-8 flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Nenhum evento nesta categoria por enquanto.
            </p>
            <button
              type="button"
              onClick={() => setCat("all")}
              className="inline-flex items-center gap-2 border-b border-primary pb-0.5 font-display text-[10px] font-bold uppercase tracking-[0.28em] text-primary hover:opacity-80"
            >
              Ver todos os eventos <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-[color-mix(in_oklab,var(--foreground)_12%,transparent)] border-y border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] md:mt-8">
            {filtered.map((ev) => (
              <EventCardRow key={ev.slug} event={ev} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function EventCardRow({ event }: { event: PublicEvent }) {
  const attribution = useAttribution();
  const search = buildSearch(attribution);
  const iso = event.starts_at;
  let day = "—";
  let month = "";
  if (iso) {
    const d = new Date(iso);
    day = d.toLocaleDateString("pt-BR", { day: "2-digit", timeZone: "America/Sao_Paulo" });
    month = d
      .toLocaleDateString("pt-BR", { month: "short", timeZone: "America/Sao_Paulo" })
      .replace(".", "")
      .toUpperCase();
  }
  return (
    <li>
      <Link
        to="/eventos/$slug"
        params={{ slug: event.slug }}
        search={search}
        onClick={() => trackHomeEvent(event.slug, "home_event_card_click", attribution)}
        className="group grid grid-cols-[auto,1fr,auto] items-center gap-4 py-5 md:grid-cols-[6rem,1fr,auto] md:gap-8 md:py-8"
      >
        <div className="flex flex-col items-start leading-none">
          <span className="date-block text-4xl text-foreground md:text-6xl">{day}</span>
          <span className="mt-1 font-display text-[10px] font-bold uppercase tracking-[0.3em] text-primary md:mt-2 md:text-xs">
            {month}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="poster text-xl text-foreground transition-colors group-hover:text-primary md:text-3xl">
            {event.title}
          </h3>
          <p className="mt-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground md:mt-2 md:text-xs">
            {formatEventDateEditorial(event.starts_at, event.ends_at)}
          </p>
          {(event.venue_name || event.city) && (
            <p className="mt-1 flex items-center gap-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground md:text-xs">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {[event.venue_name, event.city].filter(Boolean).join(" · ")}
              </span>
            </p>
          )}
          <span className="mt-3 inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.28em] text-primary transition-opacity group-hover:opacity-80 md:hidden">
            Ver evento <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
        <ArrowRight
          aria-hidden
          className="hidden h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary md:block"
        />
      </Link>
    </li>
  );
}

/* =============================== NOTÍCIAS ============================== */

function NewsSection({ items }: { items: HomeNewsItem[] }) {
  const attribution = useAttribution();
  const search = buildSearch(attribution);
  return (
    <section className="bg-surface/30">
      <div className="container-page py-10 md:py-24">
        <div className="max-w-4xl">
          <p className="eyebrow-label text-primary">Notícias</p>
          <h2 className="mt-4 section-title text-foreground">Últimas do universo Prudente em Foco.</h2>
        </div>
        <ul className="mt-8 grid gap-6 md:mt-12 md:grid-cols-3 md:gap-8">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                to="/eventos/$slug/noticias/$newsSlug"
                params={{ slug: n.event_slug, newsSlug: n.slug }}
                search={search}
                onClick={() => trackHomeEvent(n.event_slug, "home_news_click", attribution)}
                className="group block"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {n.image_url ? (
                    <img
                      src={n.image_url}
                      alt=""
                      loading="lazy"
                      className="image-zoom h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="h-full w-full"
                      style={{
                        background:
                          "linear-gradient(180deg, color-mix(in oklab, var(--foreground) 6%, var(--background)) 0%, var(--background) 100%)",
                      }}
                    />
                  )}
                </div>
                <p className="mt-4 font-display text-[10px] font-bold uppercase tracking-[0.28em] text-primary md:text-xs">
                  {n.event_title}
                </p>
                <h3 className="mt-2 font-display text-lg font-semibold leading-tight text-foreground transition-colors group-hover:text-primary md:text-xl">
                  {n.title}
                </h3>
                {n.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {n.excerpt}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* =============================== EXPERIÊNCIAS ============================== */

const CATEGORY_LABEL: Record<HomeExperience["category"], string> = {
  camarote: "Camarote",
  bistro: "Bistrô",
  mesa: "Mesa",
  other: "Área especial",
};

function ExperiencesSection({
  items,
  cms,
}: {
  items: HomeExperience[];
  cms: SiteHome | null;
}) {
  const attribution = useAttribution();
  const search = buildSearch(attribution);
  const headline = cms?.experiences_headline || "Viva o evento de outro jeito.";
  const body =
    cms?.experiences_body ||
    "Camarotes, bistrôs, mesas e áreas especiais com solicitação direta na página de cada evento.";
  return (
    <section>
      <div className="container-page py-10 md:py-24">
        <div className="max-w-4xl">
          <p className="eyebrow-label text-primary">Experiências</p>
          <h2 className="mt-4 section-title text-foreground">{headline}</h2>
          <p className="mt-4 max-w-2xl whitespace-pre-line text-base text-muted-foreground md:mt-6 md:text-lg">
            {body}
          </p>
        </div>
        <ul className="mt-8 grid gap-6 md:mt-12 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {items.map((exp) => (
            <li key={exp.space_type_id}>
              <Link
                to="/eventos/$slug"
                params={{ slug: exp.event_slug }}
                search={search}
                hash="experiencias"
                onClick={() =>
                  trackHomeEvent(exp.event_slug, "home_experience_click", attribution)
                }
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  {exp.image_url ? (
                    <img
                      src={exp.image_url}
                      alt=""
                      loading="lazy"
                      className="image-zoom h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="flex h-full w-full items-end p-5"
                      style={{
                        background:
                          "linear-gradient(180deg, color-mix(in oklab, var(--primary) 15%, transparent) 0%, var(--background) 100%)",
                      }}
                    >
                      <span className="poster text-3xl leading-[0.9] text-foreground">
                        {exp.name}
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-3 font-display text-[10px] font-bold uppercase tracking-[0.28em] text-primary md:text-xs">
                  {CATEGORY_LABEL[exp.category]}
                </p>
                <h3 className="mt-1 font-display text-base font-semibold text-foreground transition-colors group-hover:text-primary md:text-lg">
                  {exp.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                  {exp.event_title}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* =============================== MEMÓRIA ============================== */

function MemorySection({ events }: { events: PublicEvent[] }) {
  const attribution = useAttribution();
  const search = buildSearch(attribution);
  return (
    <section className="bg-surface/30">
      <div className="container-page py-10 md:py-24">
        <div className="max-w-4xl">
          <p className="eyebrow-label text-primary">Memória em foco</p>
          <h2 className="mt-4 section-title text-foreground">Arquivo Prudente em Foco.</h2>
        </div>
        <ul className="mt-8 divide-y divide-[color-mix(in_oklab,var(--foreground)_12%,transparent)] border-y border-[color-mix(in_oklab,var(--foreground)_12%,transparent)]">
          {events.map((ev) => {
            let year = "";
            if (ev.starts_at) {
              year = new Date(ev.starts_at).toLocaleDateString("pt-BR", {
                year: "numeric",
                timeZone: "America/Sao_Paulo",
              });
            }
            return (
              <li key={ev.slug}>
                <Link
                  to="/eventos/$slug"
                  params={{ slug: ev.slug }}
                  search={search}
                  className="group grid grid-cols-[auto,1fr] items-baseline gap-6 py-5 md:gap-10 md:py-7"
                >
                  <span className="date-block text-2xl text-[var(--gold)] md:text-4xl">
                    {year || "—"}
                  </span>
                  <div className="min-w-0">
                    <h3 className="poster text-lg text-foreground transition-colors group-hover:text-primary md:text-3xl">
                      {ev.title}
                    </h3>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* =============================== MEMÓRIA CMS ============================== */

function CmsMemorySection({ items }: { items: SiteMemoryItem[] }) {
  const attribution = useAttribution();
  const search = buildSearch(attribution);
  return (
    <section className="bg-surface/30">
      <div className="container-page py-10 md:py-24">
        <div className="max-w-4xl">
          <p className="eyebrow-label text-primary">Memória em foco</p>
          <h2 className="mt-4 section-title text-foreground">Arquivo Prudente em Foco.</h2>
        </div>
        <ul className="mt-8 divide-y divide-[color-mix(in_oklab,var(--foreground)_12%,transparent)] border-y border-[color-mix(in_oklab,var(--foreground)_12%,transparent)]">
          {items.map((item) => {
            const body = (
              <div className="grid grid-cols-[auto,1fr] items-baseline gap-6 py-5 md:gap-10 md:py-7">
                <span className="date-block text-2xl text-[var(--gold)] md:text-4xl">
                  {item.year_label || "—"}
                </span>
                <div className="min-w-0">
                  <h3 className="poster text-lg text-foreground md:text-3xl">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
            return (
              <li key={item.id}>
                {item.related_event_slug ? (
                  <Link
                    to="/eventos/$slug"
                    params={{ slug: item.related_event_slug }}
                    search={search}
                    className="group block transition-colors hover:text-primary"
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* =============================== CTA FINAL ============================== */

function FinalCTA({ cms }: { cms: SiteHome | null }) {
  const headline =
    cms?.final_cta_headline || "O próximo grande momento começa aqui.";
  const body = cms?.final_cta_body || "";
  const label = cms?.final_cta_button_label || "Ver agenda";
  const url = cms?.final_cta_button_url || "";
  return (
    <section className="py-10 md:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-3xl border-t border-[color-mix(in_oklab,var(--foreground)_15%,transparent)] pt-10 text-center md:pt-14">
          <p className="eyebrow-label text-primary">Agenda oficial</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-semibold leading-tight text-foreground md:text-4xl">
            {headline}
          </h2>
          {body && (
            <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-sm text-muted-foreground md:text-base">
              {body}
            </p>
          )}
          <div className="mt-6 md:mt-8">
            {url ? (
              <a
                href={url}
                className="inline-flex items-center gap-2 border-b-2 border-primary pb-1 font-display text-xs font-bold uppercase tracking-[0.3em] text-foreground transition-colors hover:text-primary"
              >
                {label} <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <Link
                to="/eventos"
                className="inline-flex items-center gap-2 border-b-2 border-primary pb-1 font-display text-xs font-bold uppercase tracking-[0.3em] text-foreground transition-colors hover:text-primary"
              >
                {label} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
