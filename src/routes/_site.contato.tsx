import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getSiteContact } from "@/lib/site.functions";

const contactQO = queryOptions({
  queryKey: ["site", "contact"],
  queryFn: () => getSiteContact(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_site/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Prudente em Foco" },
      {
        name: "description",
        content:
          "Fale com a Prudente em Foco. Canal direto para público, imprensa, parcerias e produção.",
      },
      { property: "og:title", content: "Contato — Prudente em Foco" },
      {
        property: "og:description",
        content: "Fale com a Prudente em Foco.",
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(contactQO);
  },
  component: ContatoPage,
});

const FALLBACK = {
  email: "contato@prudenteemfoco.com.br",
  whatsapp: "",
  service_message:
    "Envie sua mensagem descrevendo o assunto. Se for imprensa, indique veículo e prazo. Se for parceria ou produção, descreva o evento e a data.",
  instagram_url: "",
  institutional_message:
    "Público, imprensa, parcerias ou produção — respondemos por ordem de chegada no canal oficial abaixo.",
};

function normalizeWhatsapp(raw: string): string {
  const digits = raw.replace(/\D+/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function ContatoPage() {
  const { data: cms } = useQuery(contactQO);
  const content = {
    email: cms?.email || FALLBACK.email,
    whatsapp: cms?.whatsapp || FALLBACK.whatsapp,
    service_message: cms?.service_message || FALLBACK.service_message,
    instagram_url: cms?.instagram_url || FALLBACK.instagram_url,
    institutional_message:
      cms?.institutional_message || FALLBACK.institutional_message,
  };
  const whatsappUrl = normalizeWhatsapp(content.whatsapp);

  return (
    <>
      <section className="container-page pt-20 pb-8 md:pt-32 md:pb-16">
        <p className="eyebrow-label text-primary">Contato</p>
        <h1 className="poster mt-5 text-[clamp(2.8rem,13vw,9rem)] leading-[0.88] text-foreground md:mt-6">
          FALE
          <br />
          COM A
          <br />
          <span className="text-primary">GENTE.</span>
        </h1>
        <p className="mt-6 max-w-xl font-display text-base leading-snug text-foreground/85 md:mt-8 md:text-2xl">
          {content.institutional_message}
        </p>
      </section>

      <div className="container-page">
        <div className="rule-line" />
      </div>

      <section className="container-page py-12 md:py-24">
        <div className="grid gap-6 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-4">
            <p className="eyebrow-label text-muted-foreground">Canal oficial</p>
          </div>
          <div className="md:col-span-8 space-y-6">
            <a
              href={`mailto:${content.email}`}
              className="block break-words font-display text-[clamp(1.05rem,4.8vw,2.4rem)] font-semibold leading-tight text-foreground transition-colors hover:text-primary"
            >
              {content.email}
            </a>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-foreground/25 px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.24em] text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                WhatsApp · {content.whatsapp}
              </a>
            )}

            {content.instagram_url && (
              <div>
                <a
                  href={content.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="eyebrow-label text-primary hover:text-primary/80"
                >
                  Instagram →
                </a>
              </div>
            )}

            <p className="mt-2 max-w-xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {content.service_message}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
