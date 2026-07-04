import { Outlet, createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Activity,
  Settings,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/admin/experiencias", label: "Experiências", icon: Sparkles },
  { to: "/admin/operacao", label: "Operação", icon: Activity },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

function AdminLayout() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border-strong md:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <Link to="/admin" className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              <span className="font-display text-sm font-semibold">
                Prudente em Foco
              </span>
              <span className="hidden text-xs uppercase tracking-[0.25em] text-muted-foreground md:inline">
                · Admin
              </span>
            </Link>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Site público
          </Link>
        </div>

        {open && (
          <nav className="border-t border-border bg-background md:hidden">
            <div className="flex flex-col p-2">
              {NAV.map((item) => (
                <AdminLink
                  key={item.to}
                  item={item}
                  pathname={pathname}
                  onClick={() => setOpen(false)}
                />
              ))}
            </div>
          </nav>
        )}
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden w-60 shrink-0 border-r border-border md:block">
          <nav className="sticky top-14 flex flex-col gap-1 p-3">
            {NAV.map((item) => (
              <AdminLink key={item.to} item={item} pathname={pathname} />
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminLink({
  item,
  pathname,
  onClick,
}: {
  item: (typeof NAV)[number];
  pathname: string;
  onClick?: () => void;
}) {
  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-surface text-foreground"
          : "text-muted-foreground hover:bg-surface/60 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}
