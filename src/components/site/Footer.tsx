import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-background">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              <span className="font-display text-base font-semibold text-foreground">
                Prudente em Foco
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Plataforma institucional de eventos, experiências e operação
              profissional. Uma nova fase.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Navegação
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/eventos" className="text-foreground/80 hover:text-foreground">Eventos</Link></li>
              <li><Link to="/experiencias" className="text-foreground/80 hover:text-foreground">Experiências</Link></li>
              <li><Link to="/sobre" className="text-foreground/80 hover:text-foreground">Sobre</Link></li>
              <li><Link to="/contato" className="text-foreground/80 hover:text-foreground">Contato</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Plataforma em evolução
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Estamos construindo a nova plataforma da Prudente em Foco por
              fases. Novas seções serão publicadas progressivamente.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Prudente em Foco. Todos os direitos reservados.</p>
          <p className="opacity-70">Nova plataforma — Fase 0.</p>
        </div>
      </div>
    </footer>
  );
}
