import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, DoorOpen, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AccessValidator } from "@/components/access/AccessValidator";

export const Route = createFileRoute("/_authenticated/admin/portaria")({
  head: () => ({
    meta: [
      { title: "Portaria — Validador global · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortariaPage,
});

type EventRow = {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
};

function PortariaPage() {
  const [eventId, setEventId] = useState<string>("");

  const eventsQuery = useQuery({
    queryKey: ["portaria", "events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, starts_at, ends_at, status")
        .in("status", ["published", "draft"])
        .order("starts_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const selected = useMemo(
    () => eventsQuery.data?.find((e) => e.id === eventId) ?? null,
    [eventsQuery.data, eventId],
  );

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Admin
        </Link>
        <div className="inline-flex items-center gap-2 text-sm">
          <DoorOpen className="h-4 w-4 text-primary" />
          <strong>Portaria</strong>
          <span className="text-xs text-muted-foreground">· Validador global</span>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-card p-3">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Evento
        </label>
        {eventsQuery.isLoading ? (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
          </div>
        ) : (
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Selecione um evento…</option>
            {(eventsQuery.data ?? []).map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
                {ev.starts_at
                  ? ` — ${new Date(ev.starts_at).toLocaleDateString("pt-BR")}`
                  : ""}
              </option>
            ))}
          </select>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          O scanner só aprova QRs deste evento. QRs de outros eventos são
          recusados <strong>sem serem consumidos</strong>.
        </p>
      </div>

      {eventId ? (
        <AccessValidator
          key={eventId}
          expectedEventId={eventId}
          eventTitle={selected?.title ?? undefined}
          autoStart
        />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Selecione um evento para iniciar a portaria.
        </div>
      )}
    </div>
  );
}
