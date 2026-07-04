import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, ShieldCheck } from "lucide-react";
import { useSession } from "@/hooks/use-session";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/eventos", label: "Eventos" },
  { to: "/experiencias", label: "Experiências" },
  { to: "/sobre", label: "Sobre" },
  { to: "/contato", label: "Contato" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="group flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_var(--primary)]" />
          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            Prudente em Foco
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {!loading && user ? (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Entrar
            </Link>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-strong text-foreground md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="container-page flex flex-col py-3">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-3 text-base ${
                    active ? "bg-surface text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 border-t border-border pt-2">
              {!loading && user ? (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-3 text-base text-foreground"
                >
                  <ShieldCheck className="h-4 w-4" /> Admin
                </Link>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-3 text-base text-foreground"
                >
                  Entrar
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
