import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getNewsBySlugs, type PublicNewsFull } from "@/lib/events.functions";

function newsQO(eventSlug: string, newsSlug: string) {
  return queryOptions({
    queryKey: ["public", "event", eventSlug, "news", newsSlug],
    queryFn: () =>
      getNewsBySlugs({ data: { event_slug: eventSlug, news_slug: newsSlug } }),
  });
}

export const Route = createFileRoute("/_site/eventos/$slug/noticias/$newsSlug")({
  loader: async ({ context, params }) => {
    const n = await context.queryClient.ensureQueryData(
      newsQO(params.slug, params.newsSlug),
    );
    if (!n) throw notFound();
    return n;
  },
  head: ({ loaderData, params }) => {
    const n = loaderData as PublicNewsFull | undefined;
    const title = n
      ? `${n.title} — Prudente em Foco`
      : "Notícia — Prudente em Foco";
    const description = n?.excerpt ?? "Notícia oficial do evento.";
    const url = `/eventos/${params.slug}/noticias/${params.newsSlug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(n?.image_url
          ? [
              { property: "og:image", content: n.image_url },
              { name: "twitter:image", content: n.image_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: NewsDetailPage,
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
      <h1 className="mt-3 text-3xl font-semibold">Notícia não encontrada</h1>
    </section>
  ),
});

function NewsDetailPage() {
  const { slug, newsSlug } = Route.useParams();
  const { data: n } = useSuspenseQuery(newsQO(slug, newsSlug));
  if (!n) return null;
  return (
    <article className="container-page max-w-3xl py-16 md:py-24">
      <Link
        to="/eventos/$slug"
        params={{ slug }}
        className="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para o evento
      </Link>
      {n.published_at && (
        <p className="mt-8 font-display text-[11px] uppercase tracking-[0.3em] text-primary">
          {new Date(n.published_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}
      <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-foreground md:text-5xl">
        {n.title}
      </h1>
      {n.excerpt && (
        <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
          {n.excerpt}
        </p>
      )}
      {n.image_url && (
        <img
          src={n.image_url}
          alt=""
          className="mt-10 w-full rounded-lg border border-border/60 object-cover"
          loading="lazy"
        />
      )}
      {n.content && (
        <div className="mt-10 whitespace-pre-line text-base leading-relaxed text-foreground/90 md:text-lg">
          {n.content}
        </div>
      )}
    </article>
  );
}
