import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Plus,
  Search,
  Loader2,
  Pencil,
  Archive,
  Trash2,
  LayoutDashboard,
  Globe,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrgMembership } from "@/hooks/use-org-membership";
import {
  EVENT_STATUS_LABEL,
  EVENT_STATUS_TONE,
  formatEventDateRange,
  type EventStatus,
} from "@/lib/events";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/eventos/")({
  head: () => ({
    meta: [
      { title: "Admin — Eventos · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EventosAdminPage,
});

type Row = {
  id: string;
  title: string;
  slug: string;
  status: EventStatus;
  starts_at: string | null;
  ends_at: string | null;
  city: string | null;
  venue_name: string | null;
  updated_at: string;
};

function EventosAdminPage() {
  const { data: membership } = useOrgMembership();
  const orgId = membership?.organization_id;
  const canManage =
    membership?.role === "owner" ||
    membership?.role === "admin" ||
    membership?.role === "manager";
  const canDelete =
    membership?.role === "owner" || membership?.role === "admin";

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);


  const qc = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ["admin", "events", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, title, slug, status, starts_at, ends_at, city, venue_name, updated_at",
        )
        .eq("organization_id", orgId!)
        .order("starts_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = useMemo(() => {
    const list = eventsQuery.data ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [eventsQuery.data, query, statusFilter]);

  const archiveMut = useMutation({
    mutationFn: async (row: Row) => {
      const nextStatus: EventStatus =
        row.status === "archived" ? "draft" : "archived";
      const { error } = await supabase
        .from("events")
        .update({ status: nextStatus })
        .eq("id", row.id);
      if (error) throw error;
      await supabase.rpc("record_audit_event", {
        _organization_id: orgId!,
        _actor_user_id: (await supabase.auth.getUser()).data.user!.id,
        _action:
          nextStatus === "archived" ? "event.archive" : "event.unarchive",
        _entity_type: "event",
        _entity_id: row.id,
        _metadata: { title: row.title, slug: row.slug, from: row.status },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "events", orgId] });
      toast.success("Status atualizado.");
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase.from("events").delete().eq("id", row.id);
      if (error) throw error;
      await supabase.rpc("record_audit_event", {
        _organization_id: orgId!,
        _actor_user_id: (await supabase.auth.getUser()).data.user!.id,
        _action: "event.delete",
        _entity_type: "event",
        _entity_id: row.id,
        _metadata: { title: row.title, slug: row.slug },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "events", orgId] });
      toast.success("Evento excluído.");
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <div className="p-5 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <AdminPageHeader
          title="Eventos"
          description="Gerencie os eventos institucionais da organização."
        />
        {canManage && (
          <Link
            to="/admin/eventos/novo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Novo evento
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, slug ou cidade"
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as EventStatus | "all")
          }
          className="rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos os status</option>
          {(
            [
              "draft",
              "scheduled",
              "published",
              "cancelled",
              "archived",
            ] as EventStatus[]
          ).map((s) => (
            <option key={s} value={s}>
              {EVENT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {eventsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : eventsQuery.isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {(eventsQuery.error as Error).message}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-lg">Nenhum evento por aqui</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query || statusFilter !== "all"
                ? "Nenhum evento corresponde aos filtros atuais."
                : "Crie o primeiro evento para começar."}
            </p>
            {canManage && !query && statusFilter === "all" && (
              <Link
                to="/admin/eventos/novo"
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Criar evento
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid gap-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border bg-surface p-4 md:p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${EVENT_STATUS_TONE[row.status]}`}
                      >
                        {EVENT_STATUS_LABEL[row.status]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        /{row.slug}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-lg font-semibold leading-tight">
                      {row.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatEventDateRange(row.starts_at, row.ends_at)}
                      {(row.venue_name || row.city) && (
                        <>
                          {" · "}
                          {[row.venue_name, row.city]
                            .filter(Boolean)
                            .join(", ")}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 md:flex-wrap overflow-hidden">
                    <Link
                      to="/admin/eventos/$id"
                      params={{ id: row.id }}
                      className="inline-flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 md:flex-none whitespace-nowrap"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      Gerenciar
                    </Link>
                    <Link
                      to="/admin/eventos/$id/editar"
                      params={{ id: row.id }}
                      className="inline-flex flex-1 min-h-[40px] items-center justify-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium hover:bg-accent md:flex-none"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Link>

                    {/* Desktop: mostra tudo em linha */}
                    <Link
                      to="/admin/eventos/$id/hotsite"
                      params={{ id: row.id }}
                      className="hidden md:inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Hotsite
                    </Link>
                    {row.status === "published" ? (
                      <a
                        href={`/eventos/${row.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden md:inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Visualizar
                      </a>
                    ) : (
                      <span
                        title="Publique o evento para visualizar a página pública"
                        className="hidden md:inline-flex min-h-[36px] cursor-not-allowed items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground/60"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Visualizar
                      </span>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => archiveMut.mutate(row)}
                        disabled={archiveMut.isPending}
                        className="hidden md:inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-60"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        {row.status === "archived" ? "Desarquivar" : "Arquivar"}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(row)}
                        disabled={deleteMut.isPending}
                        className="hidden md:inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </button>
                    )}

                    {/* Mobile: menu de ações secundárias */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-border-strong text-muted-foreground hover:bg-accent md:hidden"
                        aria-label="Mais ações"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link to="/admin/eventos/$id/hotsite" params={{ id: row.id }}>
                            <Globe className="mr-2 h-4 w-4" />
                            Hotsite
                          </Link>
                        </DropdownMenuItem>
                        {row.status === "published" ? (
                          <DropdownMenuItem asChild>
                            <a href={`/eventos/${row.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Visualizar
                            </a>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem disabled>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                        )}
                        {canManage && (
                          <DropdownMenuItem
                            onSelect={() => archiveMut.mutate(row)}
                            disabled={archiveMut.isPending}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            {row.status === "archived" ? "Desarquivar" : "Arquivar"}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => setConfirmDelete(row)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete
                ? `"${confirmDelete.title}" será removido permanentemente. Essa ação não pode ser desfeita.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) {
                  deleteMut.mutate(confirmDelete);
                  setConfirmDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
