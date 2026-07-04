import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { formatEventDateEditorial, normalizeCoverUrl } from "@/lib/events";
import type { HomeFeaturedEvent } from "@/lib/home.functions";
import type { PublicCommercialLink } from "@/lib/events.functions";
import { useAttribution, buildSearch } from "@/lib/attribution";
import { trackHomeEvent } from "@/lib/home-tracking";

type SecondaryCta = {
  label: string;
  href: string;
  commercialLinkId: string | null;
};

/**
 * Resolve o CTA secundário do Hero para um evento:
 *  1. link comercial ativo do tipo 'passport' quando o evento é multi-day
 *  2. link ativo do tipo 'ticket'
 *  3. qualquer outro link ativo (sector/external_space/other)
 *  4. fallback legado: events.external_ticket_url
 *  5. senão: nenhum CTA secundário
 *
 * Consumido apenas quando o Hero renderiza; se `links` for undefined/undefined,
 * usa direto o external_ticket_url legado.
 */
export function resolveHeroSecondaryCta(
  event: HomeFeaturedEvent & { external_ticket_url?: string | null },
  links: PublicCommercialLink[] | undefined,
): SecondaryCta | null {
  const isMultiDay =
    !!event.starts_at &&
    !!event.ends_at &&
    new Date(event.ends_at).toDateString() !==
      new Date(event.starts_at).toDateString();
  const active = (links ?? []).filter((l) => l.tracking_enabled !== false);
  if (isMultiDay) {
    const p = active.find((l) => l.link_type === "passport");
    if (p) return { label: "Passaporte", href: p.destination_url, commercialLinkId: p.id };
  }
  const t = active.find((l) => l.link_type === "ticket");
  if (t) return { label: "Ingressos", href: t.destination_url, commercialLinkId: t.id };
  const other = active[0];
  if (other) return { label: other.label || "Comprar", href: other.destination_url, commercialLinkId: other.id };
  const legacy = event.external_ticket_url?.trim();
  if (legacy) return { label: "Ingressos", href: legacy, commercialLinkId: null };
  return null;
}

export type HeroSlide = {
  event: HomeFeaturedEvent & { external_ticket_url?: string | null };
  secondaryCta: SecondaryCta | null;
};

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const attribution = useAttribution();
  const search = buildSearch(attribution);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackedViews = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const hasMany = slides.length > 1;

  // Autoplay (somente com múltiplos slides e sem prefers-reduced-motion)
  useEffect(() => {
    if (!hasMany || paused || reducedMotion.current) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [hasMany, paused, slides.length]);

  // Pausa ao trocar de aba
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Track home_hero_view (uma vez por slide/sessão)
  useEffect(() => {
    const s = slides[index];
    if (!s) return;
    const slug = s.event.slug;
    if (trackedViews.current.has(slug)) return;
    const t = window.setTimeout(() => {
      trackedViews.current.add(slug);
      trackHomeEvent(slug, "home_hero_view", attribution);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [index, slides, attribution]);

  // Sincroniza scroll horizontal (mobile) ↔ index (desktop)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w === 0) return;
    el.scrollTo({ left: index * w, behavior: reducedMotion.current ? "auto" : "smooth" });
  }, [index]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w === 0) return;
    const i = Math.round(el.scrollLeft / w);
    if (i !== index && i >= 0 && i < slides.length) setIndex(i);
  };

  const pauseInteraction = () => setPaused(true);

  const go = (i: number) => {
    setPaused(true);
    setIndex(((i % slides.length) + slides.length) % slides.length);
  };

  return (
    <section
      className="relative isolate -mt-14 md:-mt-16"
      onMouseEnter={hasMany ? pauseInteraction : undefined}
      onFocus={hasMany ? pauseInteraction : undefined}
    >
      <div
        ref={containerRef}
        onScroll={hasMany ? onScroll : undefined}
        onTouchStart={hasMany ? pauseInteraction : undefined}
        className={
          hasMany
            ? "flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "flex overflow-hidden"
        }
      >
        {slides.map((slide, i) => (
          <HeroSlideView
            key={slide.event.slug}
            slide={slide}
            eager={i === 0}
            search={search}
            attribution={attribution}
          />
        ))}
      </div>

      {hasMany && (
        <>
          <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-10 flex justify-center gap-1.5 md:bottom-10">
            {slides.map((s, i) => (
              <button
                key={s.event.slug}
                type="button"
                onClick={() => go(i)}
                aria-label={`Ir para ${s.event.title}`}
                className={`pointer-events-auto h-[3px] w-8 transition-all md:w-12 ${
                  i === index ? "bg-foreground" : "bg-foreground/25 hover:bg-foreground/50"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-foreground/25 bg-background/40 p-2 backdrop-blur transition-colors hover:border-foreground/60 hover:bg-background/70 md:inline-flex"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-foreground/25 bg-background/40 p-2 backdrop-blur transition-colors hover:border-foreground/60 hover:bg-background/70 md:inline-flex"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </>
      )}
    </section>
  );
}

function HeroSlideView({
  slide,
  eager,
  search,
  attribution,
}: {
  slide: HeroSlide;
  eager: boolean;
  search: ReturnType<typeof buildSearch>;
  attribution: ReturnType<typeof useAttribution>;
}) {
  const { event, secondaryCta } = slide;
  const cover = normalizeCoverUrl(event.cover_image_url);
  return (
    <article
      className="relative flex min-w-full snap-start snap-always"
      aria-roledescription="slide"
    >
      <div className="absolute inset-0 -z-10">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading={eager ? "eager" : "lazy"}
            // @ts-expect-error attr válido; typings do React ainda não expõem
            fetchpriority={eager ? "high" : "low"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="h-full w-full"
            style={{
              background:
                "radial-gradient(70% 60% at 15% 100%, color-mix(in oklab, var(--primary) 22%, transparent) 0%, transparent 60%), linear-gradient(180deg, color-mix(in oklab, var(--foreground) 4%, var(--background)) 0%, var(--background) 100%)",
            }}
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--background) 30%, transparent) 0%, color-mix(in oklab, var(--background) 5%, transparent) 40%, color-mix(in oklab, var(--background) 88%, transparent) 88%, var(--background) 100%)",
          }}
        />
      </div>
      <div className="container-page flex min-h-[82svh] w-full flex-col justify-end pb-12 pt-20 md:min-h-[92vh] md:pb-24 md:pt-40">
        <p className="eyebrow-label text-primary">Em cartaz · Prudente em Foco</p>
        <h1 className="mt-5 poster text-[clamp(2.4rem,10vw,8.5rem)] leading-[0.9] text-foreground [text-shadow:0_2px_40px_rgba(0,0,0,0.35)] md:mt-6">
          {event.title}
        </h1>
        <div className="mt-5 flex flex-col gap-2 md:mt-8 md:flex-row md:flex-wrap md:items-baseline md:gap-x-8 md:gap-y-3">
          <p className="date-block text-[1.6rem] text-foreground md:text-5xl">
            {formatEventDateEditorial(event.starts_at, event.ends_at)}
          </p>
          {(event.venue_name || event.city) && (
            <p className="flex items-center gap-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/85 md:text-base">
              <MapPin className="h-4 w-4" />
              {[event.venue_name, event.city].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="mt-8 flex flex-col items-stretch gap-3 md:mt-10 md:flex-row md:flex-wrap md:items-center md:gap-6">
          <Link
            to="/eventos/$slug"
            params={{ slug: event.slug }}
            search={search}
            onClick={() =>
              trackHomeEvent(event.slug, "home_hero_click", attribution)
            }
            className="inline-flex items-center justify-center gap-2 bg-foreground px-6 py-3.5 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-background transition-opacity hover:opacity-90 md:px-7 md:py-4 md:text-xs"
          >
            Ver evento <ArrowRight className="h-4 w-4" />
          </Link>
          {secondaryCta && (
            <a
              href={secondaryCta.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackHomeEvent(
                  event.slug,
                  "home_ticket_click",
                  attribution,
                  secondaryCta.commercialLinkId,
                )
              }
              className="inline-flex items-center justify-center gap-2 border border-foreground/40 px-6 py-3.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground/90 hover:border-primary hover:text-primary md:px-6 md:py-4 md:text-xs"
            >
              {secondaryCta.label}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
