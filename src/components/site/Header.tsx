import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Menu, X, ShieldCheck } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useSiteMenu } from "@/hooks/use-site-menu";

const ALL_NAV = [
  { to: "/eventos", label: "Eventos", flag: "show_eventos" },
  { to: "/experiencias", label: "Experiências", flag: "show_experiencias" },
  { to: "/sobre", label: "Nossa História", flag: "show_sobre" },
  { to: "/contato", label: "Contato", flag: "show_contato" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useSession();
  const menu = useSiteMenu();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const NAV = useMemo(() => ALL_NAV.filter((n) => menu[n.flag]), [menu]);
  const showVerAgenda = menu.show_ver_agenda;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll + ESC-to-close while menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
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
    <>
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
          {showVerAgenda && (
            <Link
              to="/eventos"
              className="eyebrow-label text-primary transition-opacity hover:opacity-80"
            >
              Ver agenda →
            </Link>
          )}
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
          onClick={() => setOpen(!open)}
          className="relative inline-flex h-10 w-10 items-center justify-center text-foreground md:hidden"
        >
          <Menu
            className={`absolute h-6 w-6 transition-all duration-200 motion-reduce:transition-none ${
              open ? "rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"
            }`}
          />
          <X
            className={`absolute h-6 w-6 transition-all duration-200 motion-reduce:transition-none ${
              open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0"
            }`}
          />
        </button>
      </div>
    </header>

    {/* Full-viewport editorial mobile menu — sibling of <header> to escape backdrop-filter containing block */}
    <div
      className={`fixed inset-x-0 bottom-0 top-14 z-50 overflow-y-auto overscroll-contain bg-background md:hidden ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      } transition-opacity duration-200 motion-reduce:transition-none`}
      aria-hidden={!open}
    >
      <div className="flex min-h-full flex-col pt-6 pb-10">
        <nav
          aria-label="Menu principal"
          className="container-page flex flex-col"
        >
          {NAV.map((item, i) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              style={{
                transitionDelay: open ? `${80 + i * 55}ms` : "0ms",
              }}
              className={`group flex items-start gap-4 border-b border-foreground/10 py-5 transition-all duration-300 motion-reduce:transition-none ${
                open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              <span className="eyebrow-label mt-2 w-7 shrink-0 text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="poster min-w-0 flex-1 break-words text-[clamp(2rem,9vw,3rem)] leading-[0.95] text-foreground transition-colors group-hover:text-primary">
                {item.label.toUpperCase()}
              </span>
            </Link>
          ))}
        </nav>

        <div className="container-page mt-8 flex flex-col gap-4">
          {showVerAgenda && (
            <Link
              to="/eventos"
              onClick={() => setOpen(false)}
              className="poster text-2xl leading-none text-primary"
            >
              VER AGENDA →
            </Link>
          )}
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
    </>
  );
}

