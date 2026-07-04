import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
  Users,
  Check,
  Loader2,
  Music2,
  Layers,
  History,
  Instagram,
  Ticket as TicketIcon,
} from "lucide-react";
import {
  getPublishedEventBySlug,
  listEventAttractionsBySlug,
  type PublicEvent,
  type PublicAttraction,
} from "@/lib/events.functions";
import {
  listAvailableSpaceTypes,
  createSpaceReservationRequest,
  type PublicSpaceType,
} from "@/lib/reservations.functions";
import { formatEventDateRange, formatEventDateEditorial, normalizeCoverUrl } from "@/lib/events";

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

function attractionsQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["public", "event", slug, "attractions"],
    queryFn: () => listEventAttractionsBySlug({ data: { slug } }),
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
    // pré-carrega line-up (opcional, sem falhar a rota)
    void context.queryClient.prefetchQuery(attractionsQueryOptions(params.slug));
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
        ...(normalizeCoverUrl(ev?.cover_image_url)
          ? [
              { property: "og:image", content: normalizeCoverUrl(ev!.cover_image_url)! },
              { name: "twitter:image", content: normalizeCoverUrl(ev!.cover_image_url)! },
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
                image: normalizeCoverUrl(ev.cover_image_url) ?? undefined,
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
                offers: ev.external_ticket_url
                  ? {
                      "@type": "Offer",
                      url: ev.external_ticket_url,
                      availability: "https://schema.org/InStock",
                    }
                  : undefined,

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
  const cover = normalizeCoverUrl(event.cover_image_url);

  return (
    <article>
      {/* HERO — CARTAZ DO EVENTO */}
      <section className="relative isolate -mt-14 md:-mt-16">
        {cover ? (
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
                  "linear-gradient(180deg, color-mix(in oklab, var(--background) 25%, transparent) 0%, color-mix(in oklab, var(--background) 10%, transparent) 45%, color-mix(in oklab, var(--background) 90%, transparent) 90%, var(--background) 100%)",
              }}
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60% 55% at 15% 100%, color-mix(in oklab, var(--primary) 20%, transparent) 0%, transparent 65%)",
            }}
          />
        )}
        <div
          className={`container-page flex flex-col justify-end pb-16 pt-32 md:pb-24 md:pt-40 ${
            cover ? "min-h-[92vh] md:min-h-[100vh]" : "min-h-[70vh]"
          }`}
        >
          <Link
            to="/eventos"
            className="mb-8 inline-flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground/80 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Todos os eventos
          </Link>
          <p className="eyebrow-label text-primary">
            Evento oficial · Prudente em Foco
          </p>
          <h1 className="mt-6 display-xl break-words text-foreground [text-shadow:0_2px_40px_rgba(0,0,0,0.35)]">
            {event.title}
          </h1>

          <div className="mt-10 flex flex-wrap items-baseline gap-x-10 gap-y-3">
            <p className="date-block text-3xl text-foreground md:text-5xl">
              {formatEventDateEditorial(event.starts_at, event.ends_at)}
            </p>
            {(event.venue_name || event.city) && (
              <p className="flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-[0.28em] text-foreground/85 md:text-base">
                <MapPin className="h-4 w-4" />
                {[event.venue_name, event.city].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {event.short_description && (
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-foreground/85 md:text-lg">
              {event.short_description}
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            {event.external_ticket_url && (
              <a
                href={event.external_ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary px-7 py-4 font-display text-xs font-bold uppercase tracking-[0.28em] text-primary-foreground hover:opacity-90"
              >
                <TicketIcon className="h-4 w-4" />
                Comprar ingresso
              </a>
            )}
            <a
              href="#reservas"
              className={
                event.external_ticket_url
                  ? "inline-flex items-center gap-2 border-b border-foreground/60 pb-1 font-display text-xs font-semibold uppercase tracking-[0.28em] text-foreground/90 hover:border-primary hover:text-primary"
                  : "inline-flex items-center gap-2 bg-foreground px-7 py-4 font-display text-xs font-bold uppercase tracking-[0.28em] text-background hover:opacity-90"
              }
            >
              Solicitar reserva <ArrowRight className="h-3.5 w-3.5" />
            </a>
            {event.instagram_url && (
              <a
                href={event.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-[0.28em] text-foreground/80 hover:text-primary"
              >
                <Instagram className="h-3.5 w-3.5" />
                Instagram
              </a>
            )}
          </div>
        </div>
      </section>

      {event.long_description && (
        <section className="border-y border-[color-mix(in_oklab,var(--foreground)_10%,transparent)]">
          <div className="container-page py-16 md:py-24">
            <div className="max-w-3xl whitespace-pre-line text-base leading-relaxed text-foreground/85 md:text-lg">
              {event.long_description}
            </div>
          </div>
        </section>
      )}

      {/* LINE-UP */}
      <LineupSection slug={slug} />

      <div id="reservas" />
      <SpacesSection slug={slug} promoterCode={promoter ?? null} />
    </article>
  );
}


function SectionEyebrow({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-primary">
      {icon}
      <p className="font-display text-[11px] uppercase tracking-[0.35em]">
        {children}
      </p>
    </div>
  );
}

function groupByDay(list: PublicAttraction[]): { day: string | null; items: PublicAttraction[] }[] {
  const map = new Map<string | null, PublicAttraction[]>();
  for (const a of list) {
    const key = a.performs_on ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === b) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return a < b ? -1 : 1;
    })
    .map(([day, items]) => ({ day, items }));
}

function formatDayLabel(iso: string): { day: string; month: string; weekday: string } {
  // ISO date "YYYY-MM-DD" — parse locally
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return {
    day: String(d ?? "").padStart(2, "0"),
    month: dt.toLocaleString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(),
    weekday: dt.toLocaleString("pt-BR", { weekday: "short" }).replace(".", ""),
  };
}

function LineupSection({ slug }: { slug: string }) {
  const q = useQuery(attractionsQueryOptions(slug));
  const items = q.data ?? [];
  const groups = groupByDay(items);
  const [activeDay, setActiveDay] = useState<string | null>(null);

  useEffect(() => {
    if (groups.length && activeDay === null) {
      setActiveDay(groups[0].day);
    }
  }, [groups, activeDay]);

  if (q.isLoading) {
    return (
      <section className="border-b border-border">
        <div className="container-page flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }
  if (items.length === 0) return null;

  const hasMultipleDays = groups.length > 1;
  const focusedGroup =
    groups.find((g) => g.day === activeDay) ?? groups[0];

  return (
    <section className="border-y border-[color-mix(in_oklab,var(--foreground)_10%,transparent)]">
      <div className="container-page py-20 md:py-32">
        <p className="eyebrow-label text-primary">Programação</p>
        <h2 className="mt-4 section-title text-foreground">Line-up por dia.</h2>

        {/* Mobile: chips + dia em foco */}
        {hasMultipleDays && (
          <div className="mt-10 -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 md:hidden">
            {groups.map(({ day }) => {
              const label = day ? formatDayLabel(day) : null;
              const active = day === focusedGroup.day;
              return (
                <button
                  key={day ?? "sem-data"}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  className={`inline-flex shrink-0 flex-col items-center gap-0.5 border-b-2 px-3 pb-2 transition-colors ${
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground"
                  }`}
                  aria-pressed={active}
                >
                  {label ? (
                    <>
                      <span className="date-block text-3xl">{label.day}</span>
                      <span className="font-display text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
                        {label.month}
                      </span>
                      <span className="font-display text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                        {label.weekday}
                      </span>
                    </>
                  ) : (
                    <span className="font-display text-xs uppercase tracking-[0.28em]">A definir</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-8 md:hidden">
          <LineupDay group={focusedGroup} />
        </div>

        <div className="mt-12 hidden gap-x-12 gap-y-16 md:grid md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <LineupDay key={g.day ?? "sem-data"} group={g} />
          ))}
        </div>

        <p className="mt-16 max-w-xl font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Horários e ordem de apresentação serão divulgados pela produção próximo ao evento.
        </p>
      </div>
    </section>
  );
}

function LineupDay({
  group,
}: {
  group: { day: string | null; items: PublicAttraction[] };
}) {
  return (
    <div>
      {group.day ? (
        (() => {
          const l = formatDayLabel(group.day);
          return (
            <div className="flex items-baseline gap-4 pb-4">
              <span className="date-block text-6xl text-foreground md:text-7xl">
                {l.day}
              </span>
              <div className="flex flex-col leading-tight">
                <span className="font-display text-xs font-bold uppercase tracking-[0.3em] text-primary">
                  {l.month}
                </span>
                <span className="font-display text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  {l.weekday}
                </span>
              </div>
            </div>
          );
        })()
      ) : (
        <p className="font-display text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Data a definir
        </p>
      )}
      <div className="rule-line mb-6" />
      <ul className="space-y-3 md:space-y-4">
        {group.items.map((a) => (
          <li
            key={a.id}
            className="poster text-2xl leading-none text-foreground transition-colors hover:text-primary md:text-3xl"
          >
            {a.name}
          </li>
        ))}
      </ul>
    </div>
  );
}




function SpacesSection({
  slug,
  promoterCode,
}: {
  slug: string;
  promoterCode: string | null;
}) {
  const typesQuery = useQuery({
    queryKey: ["public", "event", slug, "space-types"],
    queryFn: () => listAvailableSpaceTypes({ data: { slug } }),
    staleTime: 60_000,
  });

  const [selected, setSelected] = useState<PublicSpaceType | null>(null);

  const grouped: Record<SpaceTypeCategory, PublicSpaceType[]> = {
    camarote: [],
    bistro: [],
    mesa: [],
    outro: [],
  };
  for (const t of typesQuery.data ?? []) grouped[t.category].push(t);

  const hasAny = (typesQuery.data?.length ?? 0) > 0;

  return (
    <section className="bg-surface/30">
      <div className="container-page py-20 md:py-32">
        <div className="max-w-3xl">
          <p className="eyebrow-label text-primary">Experiências</p>
          <h2 className="mt-4 section-title text-foreground">
            Viva o evento de outro jeito.
          </h2>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
            Camarote, bistrô ou mesa exclusiva. Solicite sua reserva — a produção confirma disponibilidade e condições.
          </p>
        </div>

        {typesQuery.isLoading ? (
          <div className="mt-12 flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !hasAny ? (
          <p className="mt-12 max-w-xl font-display text-sm uppercase tracking-[0.28em] text-muted-foreground">
            Espaços comerciais deste evento ainda não foram publicados.
          </p>
        ) : (
          <div className="mt-14 space-y-16 md:mt-20 md:space-y-20">
            {SPACE_TYPE_CATEGORIES.map((cat) =>
              grouped[cat].length === 0 ? null : (
                <div key={cat}>
                  <div className="mb-6 flex items-baseline justify-between gap-4">
                    <h3 className="font-display text-xs font-bold uppercase tracking-[0.3em] text-primary">
                      {SPACE_TYPE_CATEGORY_PLURAL[cat]}
                    </h3>
                    <span className="font-display text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                      {grouped[cat].length}{" "}
                      {grouped[cat].length === 1 ? "opção" : "opções"}
                    </span>
                  </div>
                  <ul className="divide-y divide-[color-mix(in_oklab,var(--foreground)_10%,transparent)] border-y border-[color-mix(in_oklab,var(--foreground)_10%,transparent)]">
                    {grouped[cat].map((t) => (
                      <SpaceRow
                        key={t.space_type_id}
                        type={t}
                        onSelect={() => setSelected(t)}
                      />
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {selected && (
        <ReservationDialog
          slug={slug}
          type={selected}
          promoterCode={promoterCode}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function SpaceRow({
  type,
  onSelect,
}: {
  type: PublicSpaceType;
  onSelect: () => void;
}) {
  const available = type.available_units > 0;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="group grid w-full grid-cols-[1fr,auto] items-baseline gap-x-6 gap-y-3 py-6 text-left md:grid-cols-[1fr,auto,auto,auto] md:gap-x-10 md:py-10"
      >
        <div className="min-w-0 md:col-start-1">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
            {SPACE_TYPE_CATEGORY_LABEL[type.category]}
          </p>
          <h4 className="mt-2 poster text-2xl text-foreground transition-colors group-hover:text-primary md:text-4xl">
            {type.name}
          </h4>
          {type.description && (
            <p className="mt-2 max-w-xl line-clamp-2 text-sm text-muted-foreground">
              {type.description}
            </p>
          )}
        </div>
        <div className="col-span-2 flex items-baseline gap-6 text-muted-foreground md:col-span-1 md:col-start-2 md:flex-col md:items-end md:gap-1 md:text-right">
          {type.capacity_per_unit != null && (
            <>
              <span className="date-block text-2xl text-foreground md:text-3xl">
                {type.capacity_per_unit}
              </span>
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.28em]">
                pessoas
              </span>
            </>
          )}
        </div>
        <div className="text-right md:col-start-3">
          {type.base_price != null ? (
            <p className="date-block text-2xl text-foreground md:text-3xl">
              {formatCurrencyBRL(type.base_price, type.currency)}
            </p>
          ) : (
            <p className="font-display text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              Sob consulta
            </p>
          )}
          <p
            className={`mt-1 font-display text-[10px] font-bold uppercase tracking-[0.28em] ${
              available ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {available
              ? `${type.available_units} disponível${type.available_units > 1 ? "eis" : ""}`
              : "Sob consulta"}
          </p>
        </div>
        <span className="hidden items-center gap-2 border-b border-foreground/40 pb-1 font-display text-xs font-bold uppercase tracking-[0.28em] text-foreground group-hover:border-primary group-hover:text-primary md:inline-flex md:col-start-4">
          Reservar <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </button>
    </li>
  );
}


function ReservationDialog({
  slug,
  type,
  promoterCode,
  onClose,
}: {
  slug: string;
  type: PublicSpaceType;
  promoterCode: string | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [partySize, setPartySize] = useState<string>(
    type.capacity_per_unit != null ? String(type.capacity_per_unit) : "",
  );
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      createSpaceReservationRequest({
        data: {
          event_slug: slug,
          space_type_id: type.space_type_id,
          requester_name: name.trim(),
          requester_contact: contact.trim(),
          promoter_code: promoterCode || undefined,
          party_size: partySize.trim() ? Number(partySize) : undefined,
          message: message.trim() || undefined,
        },
      }),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 1 || name.trim().length > 120) return;
    if (contact.trim().length < 3 || contact.trim().length > 200) return;
    const res = await mutation.mutateAsync();
    if ("error" in res) return;
    setDone(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-border bg-background md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">Solicitação recebida</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Nossa equipe entrará em contato pelo canal informado para confirmar
              disponibilidade e condições.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex items-center rounded-md border border-border-strong px-4 py-2 text-sm hover:bg-accent"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4 p-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary">
                {SPACE_TYPE_CATEGORY_LABEL[type.category]}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{type.name}</h3>
              {promoterCode && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Indicado por promoter{" "}
                  <span className="font-medium">{promoterCode}</span>
                </p>
              )}
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Nome
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                className="input mt-2"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Contato (WhatsApp ou e-mail)
              </span>
              <input
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={200}
                className="input mt-2"
                placeholder="(18) 90000-0000 ou email@exemplo.com"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Nº de pessoas (opcional)
              </span>
              <input
                type="number"
                min={1}
                max={500}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                className="input mt-2"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Mensagem (opcional)
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={3}
                className="input mt-2 resize-y"
                placeholder="Conte quando pretende chegar, ocasião, etc."
              />
            </label>
            {mutation.data && "error" in mutation.data && (
              <p className="text-sm text-destructive">{mutation.data.error}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {mutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Enviar solicitação
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border-strong px-4 py-2 text-sm hover:bg-accent"
              >
                Cancelar
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Ao enviar, você concorda que a Prudente em Foco entre em contato
              pelo canal informado. Nenhum pagamento é feito aqui.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
