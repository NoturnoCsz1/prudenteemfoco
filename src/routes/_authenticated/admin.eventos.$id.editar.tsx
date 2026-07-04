import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import { EventForm, type EventFormRecord } from "@/components/admin/EventForm";
import type { EventStatus, EventKind, EventFormat } from "@/lib/events";

export const Route = createFileRoute("/_authenticated/admin/eventos/$id/editar")({
  head: () => ({
    meta: [
      { title: "Editar evento — Admin · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditEventPage,
});

function EditEventPage() {
  const { id } = Route.useParams();

  const query = useQuery({
    queryKey: ["admin", "event", id],
    queryFn: async (): Promise<EventFormRecord | null> => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, title, slug, status, kind, format, starts_at, ends_at, venue_name, city, short_description, cover_image_url, long_description, instagram_url, external_ticket_url, is_featured, featured_order",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        title: data.title,
        slug: data.slug,
        status: data.status as EventStatus,
        kind: (data.kind ?? "other") as EventKind,
        format: (data.format ?? "one_off") as EventFormat,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        venue_name: data.venue_name,
        city: data.city,
        short_description: data.short_description,
        cover_image_url: data.cover_image_url,
        long_description: data.long_description,
        instagram_url: data.instagram_url,
        external_ticket_url: data.external_ticket_url,
        is_featured: data.is_featured ?? false,
        featured_order: data.featured_order ?? null,
      };

    },
  });

  return (
    <div className="p-5 md:p-8">
      <OperationsNav
        eventId={id}
        active="edit"
        eventTitle={query.data?.title}
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Atualize os dados. Publicar apenas quando estiver pronto.
      </p>
      <div className="mt-6 max-w-2xl">
        {query.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : query.isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {(query.error as Error).message}
          </div>
        ) : !query.data ? (
          <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">
            Evento não encontrado.{" "}
            <Link to="/admin/eventos" className="text-primary underline">
              Voltar
            </Link>
          </div>
        ) : (
          <EventForm mode="edit" initial={query.data} />
        )}
      </div>
    </div>
  );
}
