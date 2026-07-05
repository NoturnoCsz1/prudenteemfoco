import { Link } from "@tanstack/react-router";
import { useSiteMenu } from "@/hooks/use-site-menu";
import { BrandLogo } from "@/components/brand/BrandLogo";

const ALL_NAV = [
  { to: "/eventos", label: "Eventos", flag: "show_eventos" },
  { to: "/experiencias", label: "Experiências", flag: "show_experiencias" },
  { to: "/sobre", label: "Nossa História", flag: "show_sobre" },
  { to: "/contato", label: "Contato", flag: "show_contato" },
] as const;

export function SiteFooter() {
  const menu = useSiteMenu();
  const NAV = ALL_NAV.filter((n) => menu[n.flag]);
  return (
    <footer className="mt-16 bg-background text-foreground md:mt-24">
      <div className="rule-line" />
      <div className="container-page py-10 md:py-24">
        <div className="grid gap-10 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-7">
            <img
              src={logoHorizontal.url}
              alt="Prudente em Foco"
              className="h-16 w-auto object-contain md:h-24"
              width={480}
              height={140}
              loading="lazy"
              decoding="async"
            />
            <p className="poster mt-6 text-[clamp(1rem,3.2vw,1.6rem)] leading-tight text-foreground/85 md:mt-8">
              EVENTOS QUE MARCAM.
              <br />
              HISTÓRIAS QUE FICAM.
            </p>
          </div>

          <nav
            aria-label="Rodapé"
            className="md:col-span-5 md:pl-8"
          >
            <p className="eyebrow-label text-muted-foreground">Navegação</p>
            <ul className="mt-4 space-y-3 md:mt-6 md:space-y-4">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="poster inline-block text-[clamp(1.4rem,6vw,2.4rem)] leading-none text-foreground transition-colors hover:text-primary"
                  >
                    {item.label.toUpperCase()}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 rule-line md:mt-16" />

        <div className="mt-6 flex flex-col gap-3 text-xs text-muted-foreground md:mt-8 md:flex-row md:items-center md:justify-between">
          <div className="eyebrow-label leading-relaxed">
            Presidente Prudente · SP <span className="mx-2 opacity-40">·</span>
            Eventos · Cultura · Experiências
          </div>
          <p className="text-[0.75rem] tracking-wide">
            © {new Date().getFullYear()} Prudente em Foco. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
