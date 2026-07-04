import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, ShieldCheck } from "lucide-react";
import { useSession } from "@/hooks/use-session";

const NAV = [
  { to: "/eventos", label: "Eventos" },
  { to: "/experiencias", label: "Experiências" },
  { to: "/sobre", label: "Nossa História" },
  { to: "/contato", label: "Contato" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const hasHero =
    pathname === "/" || /^\/eventos\/[^/]+$/.test(pathname);
  const transparent = hasHero && !scrolled && !open;

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        transparent
          ? "bg-transparent"
          : "bg-background/90 backdrop-blur-md"
      }`}
    >
      <div className="container-page flex h-14 items-center justify-between md:h-16">
        <Link
          to="/"
          className="flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="poster text-base leading-none tracking-tight text-foreground md:text-lg">
            PRUDENTE <span className="text-primary">EM FOCO</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`eyebrow-label transition-colors ${
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

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/eventos"
            className="eyebrow-label text-primary transition-opacity hover:opacity-80"
          >
            Ver agenda →
          </Link>
          {!loading && user ? (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-none border border-foreground/20 px-3 py-2 eyebrow-label text-foreground transition-colors hover:border-foreground/60"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center text-foreground md:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Full-viewport editorial mobile menu */}
      <div
        className={`fixed inset-0 z-30 bg-background md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        } transition-opacity duration-200 motion-reduce:transition-none`}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col pt-20 pb-10">
          <nav
            aria-label="Menu principal"
            className="container-page flex flex-1 flex-col justify-center gap-6"
          >
            {NAV.map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="group flex items-baseline gap-4 border-b border-foreground/10 pb-4"
              >
                <span className="eyebrow-label w-8 text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="poster text-[clamp(2.4rem,10vw,3.5rem)] leading-none text-foreground transition-colors group-hover:text-primary">
                  {item.label.toUpperCase()}
                </span>
              </Link>
            ))}
          </nav>

          <div className="container-page mt-auto flex flex-col gap-4 pt-8">
            <Link
              to="/eventos"
              onClick={() => setOpen(false)}
              className="poster text-2xl leading-none text-primary"
            >
              VER AGENDA →
            </Link>
            {!loading && user ? (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 eyebrow-label text-muted-foreground"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Painel Admin
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
