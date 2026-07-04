import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin } from "lucide-react";
import { listPublishedEvents, type PublicEvent } from "@/lib/events.functions";
import { formatEventDateEditorial, normalizeCoverUrl } from "@/lib/events";

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
          "Produtora de festivais, shows, rodeios e experiências em Presidente Prudente. Programação oficial, memória e experiências exclusivas.",
      },
      {
        property: "og:title",
        content: "Prudente em Foco — Eventos, festivais e experiências",
      },
      {
        property: "og:description",
        content:
          "Festivais, shows e experiências em Presidente Prudente.",
      },
      { property: "og:type", content: "website" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQueryOptions),
  component: HomePage,
});

function isBigEvent(ev: PublicEvent): boolean {
  return ev.kind === "festival" || ev.kind === "special_event";
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
  const festivals = upcoming.filter(isBigEvent);
  const shows = upcoming.filter((ev) => !isBigEvent(ev));
  const featured = upcoming[0] ?? null;
  const featuredCover = featured ? normalizeCoverUrl(featured.cover_image_url) : null;
  const past = events.filter((ev) => !isUpcoming(ev));

  return (
    <>
      {featured && featuredCover ? (
        <PosterHero event={featured} />
      ) : (
        <InstitutionalHero />
      )}

      {/* EM CARTAZ — faixa editorial que abre o corpo do site */}
      {featured && (
        <EditorialStrip event={featured} />
      )}

      {/* GRANDES EVENTOS — poster row */}
      {festivals.length > 0 && (
        <Section eyebrow="Grandes eventos" title="Marcas próprias.">
          <div className="mt-14 grid gap-14 md:mt-20 md:gap-16">
            {festivals.map((ev, i) => (
              <FestivalPoster key={ev.slug} event={ev} index={i} />
            ))}
          </div>
        </Section>
      )}

      {/* AGENDA CULTURAL — shows como lista editorial */}
      {shows.length > 0 && (
        <Section eyebrow="Próximos shows" title="Agenda cultural." dark>
          <ul className="mt-10 divide-y divide-[color-mix(in_oklab,var(--foreground)_12%,transparent)] border-y border-[color-mix(in_oklab,var(--foreground)_12%,transparent)]">
            {shows.map((ev) => (
              <AgendaRow key={ev.slug} event={ev} />
            ))}
          </ul>
        </Section>
      )}

      {/* EXPERIÊNCIAS */}
      <Section eyebrow="Experiências" title="Viva o evento de outro jeito." compact>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
          Camarotes, bistrôs, mesas e áreas especiais nos eventos da Prudente em Foco.
          Solicitação direta na página de cada evento.
        </p>
        <Link
          to="/experiencias"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
        >
          Ver experiências <ArrowRight className="h-4 w-4" />
        </Link>
      </Section>

      {/* MEMÓRIA */}
      {past.length > 0 && (
        <Section eyebrow="Memória em foco" title="Arquivo Prudente em Foco." dark>
          <ul className="mt-10 divide-y divide-[color-mix(in_oklab,var(--foreground)_12%,transparent)] border-y border-[color-mix(in_oklab,var(--foreground)_12%,transparent)]">
            {past.slice(0, 8).map((ev) => (
              <MemoryRow key={ev.slug} event={ev} />
            ))}
          </ul>
        </Section>
      )}

      {/* CTA FINAL */}
      <section className="py-16 md:py-28">
        <div className="container-page">
          <div className="mx-auto max-w-3xl border-t border-[color-mix(in_oklab,var(--foreground)_15%,transparent)] pt-12 text-center md:pt-16">
            <p className="eyebrow-label text-primary">Agenda oficial</p>
            <h2 className="mx-auto mt-5 max-w-2xl font-display text-2xl font-semibold leading-tight text-foreground md:text-4xl">
              O próximo grande momento começa aqui.
            </h2>
            <div className="mt-8">
              <Link
                to="/eventos"
                className="inline-flex items-center gap-2 border-b-2 border-primary pb-1 font-display text-xs font-bold uppercase tracking-[0.3em] text-foreground transition-colors hover:text-primary"
              >
                Ver agenda <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ============ HERO CINEMATOGRÁFICO — poster full-bleed ============ */

function PosterHero({ event }: { event: PublicEvent }) {
  const cover = normalizeCoverUrl(event.cover_image_url);
  if (!cover) return null;
  return (
    <section className="relative isolate -mt-14 md:-mt-16">
      <div className="absolute inset-0 -z-10">
        <img
          src={cover}
          alt=""
          className="h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--background) 30%, transparent) 0%, color-mix(in oklab, var(--background) 5%, transparent) 40%, color-mix(in oklab, var(--background) 88%, transparent) 88%, var(--background) 100%)",
          }}
        />
      </div>
      <div className="container-page flex min-h-[78vh] flex-col justify-end pb-14 pt-24 md:min-h-[100vh] md:pb-24 md:pt-40">
        <p className="eyebrow-label text-primary">
          Em cartaz · Prudente em Foco
        </p>
        <h1 className="mt-6 display-xl text-foreground [text-shadow:0_2px_40px_rgba(0,0,0,0.35)]">
          {event.title}
        </h1>
        <div className="mt-6 flex flex-col gap-3 md:mt-8 md:flex-row md:flex-wrap md:items-baseline md:gap-x-8 md:gap-y-3">
          <p className="date-block text-[2rem] text-foreground md:text-5xl">
            {formatEventDateEditorial(event.starts_at, event.ends_at)}
          </p>
          {(event.venue_name || event.city) && (
            <p className="flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground/85 md:text-base">
              <MapPin className="h-4 w-4" />
              {[event.venue_name, event.city].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Link
            to="/eventos/$slug"
            params={{ slug: event.slug }}
            className="inline-flex items-center gap-2 bg-foreground px-7 py-4 font-display text-xs font-bold uppercase tracking-[0.28em] text-background transition-opacity hover:opacity-90"
          >
            Ver o evento <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/eventos"
            className="inline-flex items-center gap-2 border-b border-foreground/60 pb-1 font-display text-xs font-semibold uppercase tracking-[0.28em] text-foreground/90 hover:border-primary hover:text-primary"
          >
            Agenda completa
          </Link>
        </div>
      </div>
    </section>
  );
}

function InstitutionalHero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 60% at 15% 100%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 60%)",
        }}
      />
      <div className="container-page flex min-h-[68vh] flex-col justify-end pb-16 pt-24 md:min-h-[80vh] md:pb-32 md:pt-40">
        <p className="eyebrow-label text-primary">Prudente em Foco</p>
        <h1 className="mt-6 display-xl text-foreground">
          Onde a cidade
          <br />
          vira palco.
        </h1>
        <p className="mt-8 max-w-xl text-base text-muted-foreground md:text-lg">
          Produtora de festivais, shows, rodeios e experiências em Presidente Prudente.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Link
            to="/eventos"
            className="inline-flex items-center gap-2 bg-foreground px-7 py-4 font-display text-xs font-bold uppercase tracking-[0.28em] text-background hover:opacity-90"
          >
            Ver agenda <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/contato"
            className="inline-flex items-center gap-2 border-b border-foreground/60 pb-1 font-display text-xs font-semibold uppercase tracking-[0.28em] text-foreground/90 hover:border-primary hover:text-primary"
          >
            Fale com a produção
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============ FAIXA EDITORIAL "EM CARTAZ" ============ */

function EditorialStrip({ event }: { event: PublicEvent }) {
  return (
    <section className="border-y border-[color-mix(in_oklab,var(--foreground)_12%,transparent)] bg-background">
      <div className="container-page grid gap-4 py-5 md:grid-cols-[auto,1fr,auto] md:items-center md:gap-10 md:py-8">
        <p className="eyebrow-label text-primary">Em cartaz</p>
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
          <p className="font-display text-lg font-semibold leading-tight text-foreground md:text-2xl">
            {event.title}
          </p>
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground md:text-sm">
            {formatEventDateEditorial(event.starts_at, event.ends_at)}
          </p>
        </div>
        <Link
          to="/eventos/$slug"
          params={{ slug: event.slug }}
          className="justify-self-start font-display text-xs font-bold uppercase tracking-[0.3em] text-foreground hover:text-primary md:justify-self-end"
        >
          Detalhes →
        </Link>
      </div>
    </section>
  );
}

/* ============ SECTION WRAPPER ============ */

function Section({
  eyebrow,
  title,
  children,
  dark = false,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  dark?: boolean;
  compact?: boolean;
}) {
  return (
    <section className={dark ? "bg-surface/30" : ""}>
      <div className={compact ? "container-page py-14 md:py-22" : "container-page py-20 md:py-32"}>
        <div className="max-w-4xl">
          <p className="eyebrow-label text-primary">{eyebrow}</p>
          <h2 className="mt-4 section-title text-foreground">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ============ CARTAZ DE FESTIVAL (assimétrico) ============ */

function FestivalPoster({ event, index }: { event: PublicEvent; index: number }) {
  const flipped = index % 2 === 1;
  const cover = normalizeCoverUrl(event.cover_image_url);
  return (
    <Link
      to="/eventos/$slug"
      params={{ slug: event.slug }}
      className="group grid gap-6 md:grid-cols-12 md:items-end md:gap-10"
    >
      <div
        className={`relative aspect-[4/5] overflow-hidden bg-muted sm:aspect-[3/2] md:col-span-8 md:aspect-[16/10] ${
          flipped ? "md:order-2 md:col-start-5" : ""
        }`}
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="image-zoom h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col justify-between p-6 md:p-10"
            style={{
              background:
                "radial-gradient(120% 90% at 0% 0%, color-mix(in oklab, var(--primary) 22%, transparent) 0%, transparent 55%), linear-gradient(180deg, color-mix(in oklab, var(--foreground) 4%, var(--background)) 0%, var(--background) 100%)",
            }}
          >
            <p className="eyebrow-label text-primary">Prudente em Foco</p>
            <div>
              <span className="poster block text-[clamp(2.4rem,8vw,5.5rem)] leading-[0.9] text-foreground">
                {event.title}
              </span>
              <p className="mt-4 font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Imagem oficial em breve
              </p>
            </div>
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 55%, color-mix(in oklab, var(--background) 40%, transparent) 100%)",
          }}
        />
      </div>
      <div
        className={`md:col-span-4 ${flipped ? "md:order-1 md:col-start-1" : ""}`}
      >
        <p className="date-block text-3xl text-primary md:text-4xl">
          {formatEventDateEditorial(event.starts_at, event.ends_at)}
        </p>
        <h3 className="mt-4 display-lg text-foreground transition-colors group-hover:text-primary">
          {event.title}
        </h3>
        {(event.venue_name || event.city) && (
          <p className="mt-5 font-display text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {[event.venue_name, event.city].filter(Boolean).join(" · ")}
          </p>
        )}
        <span className="mt-6 inline-flex items-center gap-2 border-b border-foreground/40 pb-1 font-display text-xs font-bold uppercase tracking-[0.3em] text-foreground group-hover:border-primary group-hover:text-primary">
          Ver evento <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

/* ============ LINHA DE AGENDA (show) ============ */

function AgendaRow({ event }: { event: PublicEvent }) {
  const iso = event.starts_at;
  let day = "—";
  let month = "";
  if (iso) {
    const d = new Date(iso);
    day = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    month = d
      .toLocaleDateString("pt-BR", {
        month: "short",
        timeZone: "America/Sao_Paulo",
      })
      .replace(".", "")
      .toUpperCase();
  }
  return (
    <li>
      <Link
        to="/eventos/$slug"
        params={{ slug: event.slug }}
        className="group grid grid-cols-[auto,1fr,auto] items-center gap-4 py-6 md:grid-cols-[6rem,1fr,auto] md:gap-8 md:py-10"
      >
        <div className="flex flex-col items-start leading-none">
          <span className="date-block text-5xl text-foreground md:text-6xl">
            {day}
          </span>
          <span className="mt-1 font-display text-[10px] font-bold uppercase tracking-[0.3em] text-primary md:mt-2 md:text-xs">
            {month}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="poster text-2xl text-foreground transition-colors group-hover:text-primary md:text-4xl">
            {event.title}
          </h3>
          {(event.venue_name || event.city) && (
            <p className="mt-2 flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground md:text-xs">
              <MapPin className="h-3 w-3" />
              {[event.venue_name, event.city].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
      </Link>
    </li>
  );
}

/* ============ LINHA DE MEMÓRIA ============ */

function MemoryRow({ event }: { event: PublicEvent }) {
  let year = "";
  if (event.starts_at) {
    year = new Date(event.starts_at).toLocaleDateString("pt-BR", {
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
  }
  return (
    <li>
      <Link
        to="/eventos/$slug"
        params={{ slug: event.slug }}
        className="group grid grid-cols-[auto,1fr] items-baseline gap-6 py-6 md:gap-10 md:py-8"
      >
        <span className="date-block text-3xl text-[var(--gold)] md:text-4xl">
          {year || "—"}
        </span>
        <div className="min-w-0">
          <h3 className="poster text-xl text-foreground transition-colors group-hover:text-primary md:text-3xl">
            {event.title}
          </h3>
          {(event.venue_name || event.city) && (
            <p className="mt-2 font-display text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              {[event.venue_name, event.city].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
