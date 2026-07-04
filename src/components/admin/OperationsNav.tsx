import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  DoorOpen,
  Gauge,
  LayoutDashboard,
  MapPin,
  Megaphone,
  PencilLine,
  Sparkles,
  ShieldCheck,
  Ticket,
  UserPlus,
} from "lucide-react";
import { LogoPF } from "@/components/brand/LogoPF";

export type OperationsTab =
  | "overview"
  | "entrance"
  | "invites"
  | "credentials"
  | "engine"
  | "spaces"
  | "leads"
  | "promoters"
  | "promotions"
  | "intelligence"
  | "edit"
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
    { key: "overview", label: "Comando", to: `/admin/eventos/${eventId}`, icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { key: "entrance", label: "Entrada", to: `/admin/eventos/${eventId}/entrada`, icon: <DoorOpen className="h-3.5 w-3.5" /> },
    { key: "invites", label: "Convites", to: `/admin/eventos/${eventId}/convites`, icon: <Ticket className="h-3.5 w-3.5" /> },
    { key: "credentials", label: "Credenciais", to: `/admin/eventos/${eventId}/credenciais`, icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { key: "engine", label: "Engine", to: `/admin/eventos/${eventId}/engine`, icon: <Gauge className="h-3.5 w-3.5" /> },
    { key: "spaces", label: "Espaços", to: `/admin/eventos/${eventId}/espacos`, icon: <MapPin className="h-3.5 w-3.5" /> },
    { key: "leads", label: "Leads", to: `/admin/eventos/${eventId}/leads`, icon: <UserPlus className="h-3.5 w-3.5" /> },
    { key: "promoters", label: "Promoters", to: `/admin/eventos/${eventId}/promoters`, icon: <Megaphone className="h-3.5 w-3.5" /> },
    { key: "promotions", label: "Promoções", to: `/admin/eventos/${eventId}/promotions`, icon: <Sparkles className="h-3.5 w-3.5" /> },
    { key: "intelligence", label: "Inteligência", to: `/admin/eventos/${eventId}/intelligence`, icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { key: "edit", label: "Editar", to: `/admin/eventos/${eventId}/editar`, icon: <PencilLine className="h-3.5 w-3.5" /> },
  ];
  return (
    <div className="border-b border-border pb-1">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/admin/eventos"
          className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Todos os eventos
        </Link>
        <LogoPF size={26} showWordmark />
      </div>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {eventTitle ?? "Operação do evento"}
      </h1>
      <p className="eyebrow mt-1.5 text-primary">Centro de Controle</p>
      <nav className="mt-5 -mb-px flex gap-1 overflow-x-auto">
        {items.map((it) => (
          <Link
            key={it.key}
            to={it.to}
            className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
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
