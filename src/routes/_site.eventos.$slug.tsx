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
      {/* HERO VISUAL */}
      <section className="relative overflow-hidden border-b border-border">
        {event.cover_image_url ? (
          <>
            <div className="absolute inset-0 -z-10">
              <img
                src={event.cover_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, color-mix(in oklab, var(--background) 60%, transparent) 0%, color-mix(in oklab, var(--background) 92%, transparent) 75%, var(--background) 100%)",
                }}
              />
            </div>
            <div className="aspect-[16/10] w-full md:aspect-[21/9]" />
          </>
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60% 55% at 15% 0%, color-mix(in oklab, var(--primary) 22%, transparent) 0%, transparent 65%)",
            }}
          />
        )}
        <div className="container-page pb-14 pt-10 md:pb-20 md:pt-16">
          <Link
            to="/eventos"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Todos os eventos
          </Link>
          <p className="mt-8 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
            Evento oficial · Prudente em Foco
          </p>
          <h1 className="mt-4 max-w-4xl break-words font-display text-4xl font-black leading-[1] tracking-tight sm:text-5xl md:text-7xl">
            {event.title}
          </h1>

          <dl className="mt-10 grid gap-4 md:grid-cols-2 md:max-w-3xl">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface/80 p-4 backdrop-blur">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Quando
                </dt>
                <dd className="mt-1 text-sm">
                  {formatEventDateRange(event.starts_at, event.ends_at)}
                </dd>
              </div>
            </div>
            {(event.venue_name || event.city) && (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface/80 p-4 backdrop-blur">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
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

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#reservas"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Solicitar reserva <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* LINE-UP / ATRAÇÕES — placeholder estrutural */}
      <section className="border-b border-border">
        <div className="container-page py-14 md:py-20">
          <SectionEyebrow icon={<Music2 className="h-4 w-4" />}>
            Line-up e atrações
          </SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl font-black leading-tight md:text-4xl">
            Atrações confirmadas
          </h2>
          <div className="mt-8 rounded-2xl border border-dashed border-border-strong bg-surface/40 p-8 text-center md:p-12">
            <p className="text-sm text-muted-foreground">
              As atrações deste evento serão publicadas aqui assim que forem
              oficializadas. Nada de conteúdo especulativo.
            </p>
          </div>
        </div>
      </section>

      {/* SETORES E EXPERIÊNCIAS — placeholder estrutural */}
      <section className="border-b border-border bg-surface/30">
        <div className="container-page py-14 md:py-20">
          <SectionEyebrow icon={<Layers className="h-4 w-4" />}>
            Setores e experiências
          </SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl font-black leading-tight md:text-4xl">
            Como o evento se organiza
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Setores, áreas e experiências específicas serão publicados quando o
            mapa oficial do evento for divulgado. Reservas comerciais de
            camarotes, bistrôs e mesas estão na seção abaixo.
          </p>
        </div>
      </section>

      <div id="reservas" />
      <SpacesSection slug={slug} promoterCode={promoter ?? null} />

      {/* MEMÓRIA / HISTÓRICO — placeholder estrutural */}
      <section className="border-t border-border">
        <div className="container-page py-14 md:py-20">
          <SectionEyebrow icon={<History className="h-4 w-4" />}>
            Memória do evento
          </SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl font-black leading-tight md:text-4xl">
            Edições anteriores
          </h2>
          <div className="mt-8 rounded-2xl border border-dashed border-border-strong bg-surface/40 p-8 text-center md:p-12">
            <p className="text-sm text-muted-foreground">
              O histórico e os registros de edições anteriores aparecerão aqui
              conforme forem oficialmente publicados pela produção.
            </p>
          </div>
        </div>
      </section>
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
    <section className="border-t border-border bg-surface/40">
      <div className="container-page py-12 md:py-16">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-primary">
          Espaços comerciais
        </p>
        <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
          Reserve seu espaço
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Solicite reserva de camarote, bistrô ou mesa. Nossa equipe entra em
          contato para confirmar disponibilidade e condições.
        </p>

        {typesQuery.isLoading ? (
          <div className="mt-10 flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !hasAny ? (
          <div className="mt-10 rounded-lg border border-dashed border-border-strong bg-background p-10 text-center text-sm text-muted-foreground">
            Ainda não há espaços comerciais disponíveis para este evento.
          </div>
        ) : (
          <div className="mt-10 space-y-10">
            {SPACE_TYPE_CATEGORIES.map((cat) =>
              grouped[cat].length === 0 ? null : (
                <div key={cat}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {SPACE_TYPE_CATEGORY_PLURAL[cat]}
                  </h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {grouped[cat].map((t) => (
                      <SpaceCard
                        key={t.space_type_id}
                        type={t}
                        onSelect={() => setSelected(t)}
                      />
                    ))}
                  </div>
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

function SpaceCard({
  type,
  onSelect,
}: {
  type: PublicSpaceType;
  onSelect: () => void;
}) {
  const available = type.available_units > 0;
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-background">
      {type.image_url ? (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img src={type.image_url} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-muted text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {SPACE_TYPE_CATEGORY_LABEL[type.category]}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary">
              {SPACE_TYPE_CATEGORY_LABEL[type.category]}
            </p>
            <h4 className="mt-1 truncate font-semibold">{type.name}</h4>
          </div>
          {type.base_price != null && (
            <p className="whitespace-nowrap text-sm font-semibold">
              {formatCurrencyBRL(type.base_price, type.currency)}
            </p>
          )}
        </div>
        {type.description && (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {type.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {type.capacity_per_unit != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
              <Users className="h-3 w-3" />
              {type.capacity_per_unit} pessoas
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
              available
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {available
              ? `${type.available_units} disponível(is)`
              : "Sob consulta"}
          </span>
        </div>
        <button
          type="button"
          onClick={onSelect}
          className="mt-auto inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Solicitar reserva
        </button>
      </div>
    </article>
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
