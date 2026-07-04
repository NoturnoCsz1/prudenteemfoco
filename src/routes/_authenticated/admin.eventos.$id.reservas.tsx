import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, X, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import type { Database } from "@/integrations/supabase/types";

type ReservationStatus =
  Database["public"]["Enums"]["space_reservation_status"];

const STATUSES: readonly ReservationStatus[] = [
  "pending",
  "negotiating",
  "approved",
  "confirmed",
  "rejected",
  "cancelled",
] as const;

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "Pendente",
  negotiating: "Em negociação",
  approved: "Aprovado",
  confirmed: "Confirmado",
  rejected: "Recusado",
  cancelled: "Cancelado",
};

const STATUS_TONE: Record<ReservationStatus, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  negotiating: "bg-sky-500/15 text-sky-400",
  approved: "bg-primary/20 text-primary",
  confirmed: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/_authenticated/admin/eventos/$id/reservas")({
  head: () => ({
    meta: [
      { title: "Reservas — Operação · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReservationsPage,
});

function ReservationsPage() {
  const { id: eventId } = Route.useParams();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ReservationStatus | "all">("all");

  const eventQuery = useQuery({
    queryKey: ["admin", "event", eventId, "meta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const requestsQuery = useQuery({
    queryKey: ["admin", "event", eventId, "reservation-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("space_reservation_requests")
        .select(
          `id, status, requester_name, requester_contact, party_size, message,
           admin_notes, decided_at, created_at, space_type_id, space_id,
           promoter_id, lead_id,
           space_type:reservable_space_types(name, category),
           promoter:promoters(name, code),
           space:reservable_spaces(code)`,
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = (requestsQuery.data ?? []).filter((r) =>
    filter === "all" ? true : r.status === filter,
  );

  const counts: Record<ReservationStatus | "all", number> = {
    all: requestsQuery.data?.length ?? 0,
    pending: 0,
    negotiating: 0,
    approved: 0,
    confirmed: 0,
    rejected: 0,
    cancelled: 0,
  };
  for (const r of requestsQuery.data ?? []) counts[r.status]++;

  async function transition(
    id: string,
    next: ReservationStatus,
    admin_notes?: string,
  ) {
    const { error } = await supabase.rpc("set_space_reservation_status", {
      _request_id: id,
      _new_status: next,
      _admin_notes: admin_notes ?? undefined,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Status: ${STATUS_LABEL[next]}`);
    qc.invalidateQueries({
      queryKey: ["admin", "event", eventId, "reservation-requests"],
    });
  }

  return (
    <div className="p-5 md:p-8">
      <OperationsNav
        eventId={eventId}
        active="reservations"
        eventTitle={eventQuery.data?.title}
      />

      <div className="mt-6">
        <h1 className="text-lg font-semibold">Solicitações de reserva</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedidos vindos da página pública do evento. Aprove, negocie ou recuse.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-border-strong text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_LABEL[s]}{" "}
            <span className="ml-1 text-[10px] text-muted-foreground">
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3">
        {requestsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-strong bg-surface/40 p-10 text-center text-sm text-muted-foreground">
            Nenhuma solicitação{" "}
            {filter === "all" ? "ainda" : `com status "${STATUS_LABEL[filter]}"`}.
          </p>
        ) : (
          rows.map((r) => (
            <ReservationCard
              key={r.id}
              request={r}
              onTransition={transition}
            />
          ))
        )}
      </div>
    </div>
  );
}

type ReservationRow = {
  id: string;
  status: ReservationStatus;
  requester_name: string;
  requester_contact: string;
  party_size: number | null;
  message: string | null;
  admin_notes: string | null;
  created_at: string;
  decided_at: string | null;
  space_type_id: string;
  space_id: string | null;
  promoter_id: string | null;
  lead_id: string | null;
  space_type: { name: string; category: string } | null;
  promoter: { name: string; code: string } | null;
  space: { code: string } | null;
};

function ReservationCard({
  request,
  onTransition,
}: {
  request: ReservationRow;
  onTransition: (
    id: string,
    next: ReservationStatus,
    admin_notes?: string,
  ) => Promise<void>;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(request.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[request.status]}`}
            >
              {STATUS_LABEL[request.status]}
            </span>
            {request.space_type && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-primary">
                {request.space_type.name}
              </span>
            )}
            {request.promoter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {request.promoter.name} ({request.promoter.code})
              </span>
            )}
            {request.space && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400">
                Unidade: {request.space.code}
              </span>
            )}
          </div>
          <p className="mt-2 font-medium">{request.requester_name}</p>
          <p className="text-xs text-muted-foreground">
            {request.requester_contact}
            {request.party_size ? ` · ${request.party_size} pessoas` : ""}
          </p>
          {request.message && (
            <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">
              “{request.message}”
            </p>
          )}
          <p className="mt-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Recebido em {new Date(request.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ActionButton
            disabled={request.status === "negotiating"}
            onClick={() => onTransition(request.id, "negotiating")}
          >
            Negociar
          </ActionButton>
          <ActionButton
            disabled={request.status === "approved"}
            onClick={() => onTransition(request.id, "approved")}
          >
            <Check className="h-3.5 w-3.5" /> Aprovar
          </ActionButton>
          <ActionButton
            disabled={request.status === "confirmed"}
            onClick={() => onTransition(request.id, "confirmed")}
          >
            <Check className="h-3.5 w-3.5" /> Confirmar
          </ActionButton>
          <ActionButton
            disabled={request.status === "rejected"}
            onClick={() => onTransition(request.id, "rejected")}
          >
            <X className="h-3.5 w-3.5" /> Recusar
          </ActionButton>
          <ActionButton
            disabled={request.status === "cancelled"}
            onClick={() => onTransition(request.id, "cancelled")}
          >
            Cancelar
          </ActionButton>
          <ActionButton onClick={() => setNotesOpen((v) => !v)}>
            <MessageSquare className="h-3.5 w-3.5" /> Notas
          </ActionButton>
        </div>
      </div>
      {notesOpen && (
        <div className="mt-3 border-t border-border pt-3">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Observações internas
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              className="input mt-2 resize-y"
              placeholder="Contexto da negociação, condições combinadas..."
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onTransition(request.id, request.status, notes);
                  setNotesOpen(false);
                } finally {
                  setSaving(false);
                }
              }}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              Salvar notas
            </button>
            <button
              type="button"
              onClick={() => setNotesOpen(false)}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="inline-flex items-center gap-1 rounded-md border border-border-strong px-2.5 py-1.5 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
