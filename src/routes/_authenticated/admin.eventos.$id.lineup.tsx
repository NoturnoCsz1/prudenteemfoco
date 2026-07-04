import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import { useOrgMembership } from "@/hooks/use-org-membership";

export const Route = createFileRoute("/_authenticated/admin/eventos/$id/lineup")({
  head: () => ({
    meta: [
      { title: "Line-up — Admin · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LineupAdminPage,
});

type Attraction = {
  id: string;
  name: string;
  performs_on: string | null;
  sort_order: number;
  image_url: string | null;
  notes: string | null;
};

function LineupAdminPage() {
  const { id: eventId } = Route.useParams();
  const qc = useQueryClient();
  const { data: membership } = useOrgMembership();

  const eventQuery = useQuery({
    queryKey: ["admin", "event", eventId, "meta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("title")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const list = useQuery({
    queryKey: ["admin", "event", eventId, "attractions"],
    queryFn: async (): Promise<Attraction[]> => {
      const { data, error } = await supabase
        .from("event_attractions")
        .select("id, name, performs_on, sort_order, image_url, notes")
        .eq("event_id", eventId)
        .order("performs_on", { ascending: true, nullsFirst: false })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Attraction[];
    },
  });

  const [name, setName] = useState("");
  const [performsOn, setPerformsOn] = useState("");
  const [sortOrder, setSortOrder] = useState<string>("10");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!membership) throw new Error("Sem organização ativa.");
      const trimmed = name.trim();
      if (trimmed.length < 1) throw new Error("Informe o nome da atração.");
      const { error } = await supabase.from("event_attractions").insert({
        organization_id: membership.organization_id,
        event_id: eventId,
        name: trimmed,
        performs_on: performsOn || null,
        sort_order: sortOrder ? Number(sortOrder) : 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atração adicionada.");
      setName("");
      qc.invalidateQueries({ queryKey: ["admin", "event", eventId, "attractions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("event_attractions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atração removida.");
      qc.invalidateQueries({ queryKey: ["admin", "event", eventId, "attractions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-5 md:p-8">
      <OperationsNav
        eventId={eventId}
        active="lineup"
        eventTitle={eventQuery.data?.title}
      />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr,1.4fr]">
        <section className="rounded-lg border border-border bg-surface/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Nova atração
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastre apenas atrações confirmadas oficialmente. Não informe
            horários que ainda não estejam definidos.
          </p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Nome
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                className="input mt-2"
                placeholder="Ex.: Zé Neto & Cristiano"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Dia
                </span>
                <input
                  type="date"
                  value={performsOn}
                  onChange={(e) => setPerformsOn(e.target.value)}
                  className="input mt-2"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Ordem
                </span>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="input mt-2"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar atração
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Programação cadastrada
          </h2>
          <div className="mt-4 rounded-lg border border-border">
            {list.isLoading ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (list.data?.length ?? 0) === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma atração cadastrada. Adicione a primeira ao lado.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {list.data!.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {a.performs_on ?? "Sem data"} · ordem {a.sort_order}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remover "${a.name}"?`)) {
                          deleteMutation.mutate(a.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// keep Save import used so linter doesn't complain if reused
void Save;
