import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getSiteAbout } from "@/lib/site.functions";

const aboutQO = queryOptions({
  queryKey: ["site", "about"],
  queryFn: () => getSiteAbout(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_site/sobre")({
  head: () => ({
    meta: [
      { title: "Nossa história — Prudente em Foco" },
      {
        name: "description",
        content:
          "Prudente em Foco: uma história no centro dos acontecimentos de Presidente Prudente. Eventos, cultura e memória.",
      },
      { property: "og:title", content: "Nossa história — Prudente em Foco" },
      {
        property: "og:description",
        content: "Uma história no centro dos acontecimentos.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(aboutQO);
  },
  component: SobrePage,
});

const FALLBACK = {
  title: "Nossa história",
  subtitle:
    "Uma história no centro dos acontecimentos de Presidente Prudente — eventos, cultura e memória.",
  origin_body:
    "Nascemos em Presidente Prudente, no interior de São Paulo, acompanhando de perto os eventos, a cultura e as pessoas que movimentam a cidade.\n\nAo longo dos anos, construímos uma relação direta com o público, com produtores e com quem faz cultura acontecer na região.",
  today_body:
    "Reunimos agenda, line-up e experiências dos grandes eventos da cidade em um só lugar. Cada informação aparece aqui quando pode ser publicada com verdade.",
  memory_body:
    "A linha do tempo dos grandes eventos — edições, atrações e bastidores — será publicada conforme cada acervo for organizado. Aqui, cada história aparece quando pode ser contada com verdade.",
};

function SobrePage() {
  const { data: cms } = useQuery(aboutQO);
  const content = {
    title: cms?.title || FALLBACK.title,
    subtitle: cms?.subtitle || FALLBACK.subtitle,
    origin_body: cms?.origin_body || FALLBACK.origin_body,
    today_body: cms?.today_body || FALLBACK.today_body,
    memory_body: cms?.memory_body || FALLBACK.memory_body,
    image_url: cms?.image_url || null,
  };

  return (
    <>
      <section className="container-page pt-20 pb-8 md:pt-32 md:pb-16">
        <p className="eyebrow-label text-primary">{content.title}</p>
        <h1 className="poster mt-5 text-[clamp(2.8rem,13vw,8.5rem)] leading-[0.88] text-foreground md:mt-6">
          PRUDENTE
          <br />
          <span className="text-primary">EM FOCO.</span>
        </h1>
        <p className="mt-6 max-w-2xl font-display text-base leading-snug text-foreground/85 md:mt-8 md:text-2xl">
          {content.subtitle}
        </p>
      </section>

      {content.image_url && (
        <section className="container-page pb-8 md:pb-12">
          <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
            <img
              src={content.image_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </section>
      )}

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-10 md:py-20">
        <div className="grid gap-4 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-4">
            <p className="eyebrow-label text-muted-foreground">Origem</p>
          </div>
          <div className="md:col-span-8">
            <div className="whitespace-pre-line font-display text-xl leading-snug text-foreground md:text-3xl">
              {content.origin_body}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-10 md:py-20">
        <div className="grid gap-4 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-4">
            <p className="eyebrow-label text-muted-foreground">Hoje</p>
          </div>
          <div className="md:col-span-8">
            <div className="whitespace-pre-line text-base leading-relaxed text-muted-foreground md:text-lg">
              {content.today_body}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-10 md:py-20">
        <div className="grid gap-4 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-4">
            <p className="eyebrow-label text-muted-foreground">Memória</p>
          </div>
          <div className="md:col-span-8">
            <div className="whitespace-pre-line text-base leading-relaxed text-muted-foreground md:text-lg">
              {content.memory_body}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
