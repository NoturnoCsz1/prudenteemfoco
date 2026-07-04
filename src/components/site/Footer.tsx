import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/eventos", label: "Eventos" },
  { to: "/experiencias", label: "Experiências" },
  { to: "/sobre", label: "Nossa História" },
  { to: "/contato", label: "Contato" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-background text-foreground">
      <div className="rule-line" />
      <div className="container-page py-16 md:py-24">
        <div className="grid gap-14 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-7">
            <h2 className="poster text-[clamp(2.2rem,10vw,7rem)] leading-[0.85] text-foreground">
              PRUDENTE
              <br />
              <span className="text-primary">EM FOCO</span>
            </h2>
            <p className="poster mt-6 text-[clamp(1.1rem,2.4vw,1.6rem)] leading-tight text-foreground/85">
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
            <ul className="mt-6 space-y-4">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="poster inline-block text-[clamp(1.6rem,4.5vw,2.4rem)] leading-none text-foreground transition-colors hover:text-primary"
                  >
                    {item.label.toUpperCase()}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-16 rule-line" />

        <div className="mt-8 flex flex-col gap-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="eyebrow-label">
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
