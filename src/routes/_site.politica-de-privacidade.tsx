import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_site/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Prudente em Foco" },
      {
        name: "description",
        content:
          "Política de Privacidade do Prudente em Foco: como coletamos, usamos e protegemos dados dos usuários, incluindo cookies e Google AdSense.",
      },
      { property: "og:title", content: "Política de Privacidade — Prudente em Foco" },
      {
        property: "og:description",
        content:
          "Como o Prudente em Foco coleta, usa e protege dados dos usuários, incluindo uso de cookies e Google AdSense.",
      },
      { property: "og:type", content: "article" },
      {
        property: "og:url",
        content: "https://prudentemfoco.com.br/politica-de-privacidade",
      },
      { name: "robots", content: "index,follow" },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://prudentemfoco.com.br/politica-de-privacidade",
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 md:mt-14">
      <h2 className="poster text-[clamp(1.4rem,4vw,2rem)] leading-tight text-foreground">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground/85 md:text-base">
        {children}
      </div>
    </section>
  );
}

function PrivacyPolicyPage() {
  return (
    <section>
      <div className="container-page pb-20 pt-20 md:pb-32 md:pt-32">
        <p className="eyebrow-label text-primary">Documento oficial</p>
        <h1 className="mt-5 poster text-[clamp(2.2rem,8vw,5rem)] leading-[0.9] text-foreground md:mt-6">
          Política de Privacidade
        </h1>
        <p className="mt-6 max-w-2xl font-display text-base leading-snug text-foreground/85 md:text-lg">
          O Prudente em Foco valoriza a privacidade dos seus usuários e está
          comprometido com a proteção dos dados pessoais coletados durante a
          navegação.
        </p>

        <div className="mt-10 max-w-3xl md:mt-14">
          <Section title="Coleta de informações">
            <p>
              Podemos coletar informações de navegação, dados técnicos e
              informações fornecidas voluntariamente pelo usuário através de
              formulários de contato e interações realizadas no site.
            </p>
          </Section>

          <Section title="Uso das informações">
            <p>
              As informações coletadas são utilizadas para melhorar a
              experiência dos usuários, oferecer conteúdos relevantes, analisar
              o desempenho do site e aprimorar nossos serviços.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              Utilizamos cookies e tecnologias semelhantes para melhorar a
              navegação, analisar acessos e personalizar conteúdos.
            </p>
          </Section>

          <Section title="Google AdSense">
            <p>
              Este site utiliza o Google AdSense, serviço de publicidade
              fornecido pelo Google, que pode utilizar cookies para exibir
              anúncios relevantes aos usuários.
            </p>
            <p>
              O Google utiliza cookies de publicidade para permitir que
              anúncios sejam exibidos com base nas visitas anteriores dos
              usuários a este e a outros sites.
            </p>
            <p>
              Os usuários podem gerenciar suas preferências de anúncios através
              das{" "}
              <a
                href="https://adssettings.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                configurações de publicidade do Google
              </a>
              .
            </p>
          </Section>

          <Section title="Links externos">
            <p>
              Nosso site pode conter links para sites externos. Não somos
              responsáveis pelas práticas de privacidade ou conteúdos desses
              terceiros.
            </p>
          </Section>

          <Section title="Segurança">
            <p>
              Adotamos medidas técnicas para proteger as informações e garantir
              uma experiência segura aos usuários.
            </p>
          </Section>

          <Section title="Contato">
            <p>
              Para dúvidas, sugestões ou solicitações relacionadas à
              privacidade, entre em contato através dos canais oficiais do
              Prudente em Foco.
            </p>
          </Section>
        </div>
      </div>
    </section>
  );
}
