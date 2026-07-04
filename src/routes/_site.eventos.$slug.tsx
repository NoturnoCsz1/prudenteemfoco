import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowLeft, CalendarDays, MapPin, Users, Check, Loader2 } from "lucide-react";
import {
  getPublishedEventBySlug,
  type PublicEvent,
} from "@/lib/events.functions";
import {
  listAvailableSpaceTypes,
  createSpaceReservationRequest,
  type PublicSpaceType,
} from "@/lib/reservations.functions";
import { formatEventDateRange } from "@/lib/events";
import { supabase } from "@/integrations/supabase/client";
import {
  SPACE_TYPE_CATEGORY_LABEL,
  SPACE_TYPE_CATEGORY_PLURAL,
  SPACE_TYPE_CATEGORIES,
  formatCurrencyBRL,
  type SpaceTypeCategory,
} from "@/lib/operations";

function eventQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["public", "event", slug],
    queryFn: () => getPublishedEventBySlug({ data: { slug } }),
  });
}

const searchSchema = z.object({
  promoter: z.string().trim().min(1).max(64).optional(),
});

export const Route = createFileRoute("/_site/eventos/$slug")({
  validateSearch: (s) => searchSchema.parse(s),
  loader: async ({ context, params }) => {
    const event = await context.queryClient.ensureQueryData(
      eventQueryOptions(params.slug),
    );
    if (!event) throw notFound();
    return event;
  },
  head: ({ loaderData, params }) => {
    const ev = loaderData as PublicEvent | undefined;
    const title = ev
      ? `${ev.title} — Prudente em Foco`
      : "Evento — Prudente em Foco";
    const description =
      ev?.short_description ??
      "Detalhes oficiais deste evento da Prudente em Foco.";
    const url = `/eventos/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(ev?.cover_image_url
          ? [
              { property: "og:image", content: ev.cover_image_url },
              { name: "twitter:image", content: ev.cover_image_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: ev
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Event",
                name: ev.title,
                description: ev.short_description ?? undefined,
                startDate: ev.starts_at ?? undefined,
                endDate: ev.ends_at ?? undefined,
                image: ev.cover_image_url ?? undefined,
                location:
                  ev.venue_name || ev.city
                    ? {
                        "@type": "Place",
                        name: ev.venue_name ?? ev.city ?? "",
                        address: ev.city ?? undefined,
                      }
                    : undefined,
                organizer: {
                  "@type": "Organization",
                  name: "Prudente em Foco",
                },
              }),
            },
          ]
        : [],
    };
  },
  component: EventDetailPage,
  errorComponent: ({ error }) => (
    <section className="container-page py-16">
      <p className="text-sm text-destructive">{error.message}</p>
    </section>
  ),
  notFoundComponent: () => (
    <section className="container-page py-24 text-center">
      <p className="font-display text-xs uppercase tracking-[0.3em] text-primary">
        404
      </p>
      <h1 className="mt-3 text-3xl font-semibold">Evento não encontrado</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Este evento não existe ou ainda não foi publicado.
      </p>
      <Link
        to="/eventos"
        className="mt-6 inline-flex items-center gap-2 rounded-md border border-border-strong px-4 py-2 text-sm hover:bg-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para eventos
      </Link>
    </section>
  ),
});

function EventDetailPage() {
  const { slug } = Route.useParams();
  const { promoter } = Route.useSearch();
  const { data: event } = useSuspenseQuery(eventQueryOptions(slug));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `pf:lead:${slug}:${promoter ?? ""}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase
      .rpc("track_public_lead", {
        _event_slug: slug,
        _promoter_code: promoter ?? null,
        _source: promoter ? "promoter" : "direct",
        _metadata: {
          referrer: document.referrer || null,
          ua: navigator.userAgent,
        },
      })
      .then(({ error }) => {
        if (error) console.warn("[track_public_lead]", error.message);
      });
  }, [slug, promoter]);

  if (!event) return null;

  return (
    <article>
      {event.cover_image_url && (
        <div className="relative aspect-[21/9] w-full overflow-hidden border-b border-border bg-muted">
          <img
            src={event.cover_image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <section className="container-page py-12 md:py-16">
        <Link
          to="/eventos"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Todos os eventos
        </Link>
        <p className="mt-6 font-display text-xs uppercase tracking-[0.3em] text-primary">
          Evento oficial
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
          {event.title}
        </h1>

        <dl className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
            <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Quando
              </dt>
              <dd className="mt-1 text-sm">
                {formatEventDateRange(event.starts_at, event.ends_at)}
              </dd>
            </div>
          </div>
          {(event.venue_name || event.city) && (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
              <MapPin className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Onde
                </dt>
                <dd className="mt-1 text-sm">
                  {[event.venue_name, event.city].filter(Boolean).join(", ")}
                </dd>
              </div>
            </div>
          )}
        </dl>

        {event.short_description && (
          <p className="mt-10 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {event.short_description}
          </p>
        )}
      </section>
    </article>
  );
}
