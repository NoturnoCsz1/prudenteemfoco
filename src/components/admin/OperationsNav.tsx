import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  DoorOpen,
  Gauge,
  LayoutDashboard,
  MapPin,
  PencilLine,
  ShieldCheck,
  Ticket,
} from "lucide-react";

export type OperationsTab =
  | "overview"
  | "entrance"
  | "invites"
  | "credentials"
  | "engine"
  | "spaces"
  | "edit"
  // legacy tab keys — routes still exist but not shown in nav
  | "details"
  | "sectors"
  | "access";

export function OperationsNav({
  eventId,
  active,
  eventTitle,
}: {
  eventId: string;
  active: OperationsTab;
  eventTitle?: string | null;
}) {
  const items: {
    key: OperationsTab;
    label: string;
    to: string;
    icon: React.ReactNode;
  }[] = [
    { key: "overview", label: "Visão Geral", to: `/admin/eventos/${eventId}`, icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { key: "entrance", label: "Entrada", to: `/admin/eventos/${eventId}/entrada`, icon: <DoorOpen className="h-3.5 w-3.5" /> },
    { key: "invites", label: "Convites", to: `/admin/eventos/${eventId}/convites`, icon: <Ticket className="h-3.5 w-3.5" /> },
    { key: "credentials", label: "Credenciais", to: `/admin/eventos/${eventId}/credenciais`, icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { key: "engine", label: "Engine", to: `/admin/eventos/${eventId}/engine`, icon: <Gauge className="h-3.5 w-3.5" /> },
    { key: "spaces", label: "Espaços", to: `/admin/eventos/${eventId}/espacos`, icon: <MapPin className="h-3.5 w-3.5" /> },
    { key: "edit", label: "Editar", to: `/admin/eventos/${eventId}/editar`, icon: <PencilLine className="h-3.5 w-3.5" /> },
  ];
  return (
    <div className="border-b border-border">
      <Link
        to="/admin/eventos"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Todos os eventos
      </Link>
      <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
        {eventTitle ?? "Operação do evento"}
      </h1>
      <p className="mt-1 text-xs uppercase tracking-[0.25em] text-primary">
        Operação
      </p>
      <nav className="mt-4 -mb-px flex gap-1 overflow-x-auto">
        {items.map((it) => (
          <Link
            key={it.key}
            to={it.to}
            className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors ${
              active === it.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {it.icon}
            {it.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
