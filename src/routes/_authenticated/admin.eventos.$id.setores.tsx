import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrgMembership } from "@/hooks/use-org-membership";
import { OperationsNav } from "@/components/admin/OperationsNav";
import {
  SECTOR_STATUSES,
  SECTOR_STATUS_LABEL,
  type SectorStatus,
  slugify,
} from "@/lib/operations";
import type { Database } from "@/integrations/supabase/types";

type Sector = Database["public"]["Tables"]["event_sectors"]["Row"];

export const Route = createFileRoute("/_authenticated/admin/eventos/$id/setores")({
  head: () => ({
    meta: [
      { title: "Setores — Operação · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SectorsPage,
});

function SectorsPage() {
  const { id: eventId } = Route.useParams();
  const { data: membership } = useOrgMembership();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Sector | "new" | null>(null);

  const eventQuery = useQuery({
    queryKey: ["admin", "event", eventId, "meta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, organization_id")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const sectorsQuery = useQuery({
    queryKey: ["admin", "event", eventId, "sectors"],
    queryFn: async (): Promise<Sector[]> => {
      const { data, error } = await supabase
        .from("event_sectors")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function move(sector: Sector, dir: -1 | 1) {
    const list = sectorsQuery.data ?? [];
    const idx = list.findIndex((s) => s.id === sector.id);
    const swap = list[idx + dir];
    if (!swap) return;
    const { error } = await supabase
      .from("event_sectors")
      .upsert([
        { ...sector, sort_order: swap.sort_order },
        { ...swap, sort_order: sector.sort_order },
      ]);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin", "event", eventId, "sectors"] });
  }

  async function toggleStatus(sector: Sector, next: SectorStatus) {
    if (!membership) return;
    const { error } = await supabase
      .from("event_sectors")
      .update({ status: next })
      .eq("id", sector.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    await supabase.rpc("record_audit_event", {
      _organization_id: sector.organization_id,
      _actor_user_id: userRes.user!.id,
      _action:
        next === "archived" ? "sector.archived" : "sector.status_changed",
      _entity_type: "event_sector",
      _entity_id: sector.id,
      _metadata: { from: sector.status, to: next },
    });
    toast.success("Status atualizado.");
    qc.invalidateQueries({ queryKey: ["admin", "event", eventId, "sectors"] });
  }

  return (
    <div className="p-5 md:p-8">
      <OperationsNav
        eventId={eventId}
        active="sectors"
        eventTitle={eventQuery.data?.title}
      />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Setores são categorias de acesso do evento (Pista, VIP, Front Stage,
          Open Bar).
        </p>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo setor
          </button>
        )}
      </div>

      {editing !== null && membership && eventQuery.data && (
        <div className="mt-5 rounded-lg border border-border bg-surface p-5">
          <SectorForm
            eventId={eventId}
            organizationId={eventQuery.data.organization_id}
            initial={editing === "new" ? null : editing}
            existingSlugs={
              (sectorsQuery.data ?? [])
                .filter((s) => (editing === "new" ? true : s.id !== editing.id))
                .map((s) => s.slug)
            }
            onDone={() => {
              setEditing(null);
              qc.invalidateQueries({
                queryKey: ["admin", "event", eventId, "sectors"],
              });
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="mt-6">
        {sectorsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sectorsQuery.data && sectorsQuery.data.length > 0 ? (
          <ul className="grid gap-3">
            {sectorsQuery.data.map((s, i) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {SECTOR_STATUS_LABEL[s.status]}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {s.slug}
                    {s.capacity != null && ` · cap. ${s.capacity}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Subir"
                    disabled={i === 0}
                    onClick={() => move(s, -1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-strong hover:bg-accent disabled:opacity-40"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Descer"
                    disabled={i === (sectorsQuery.data?.length ?? 0) - 1}
                    onClick={() => move(s, 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-strong hover:bg-accent disabled:opacity-40"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <select
                    value={s.status}
                    onChange={(e) =>
                      toggleStatus(s, e.target.value as SectorStatus)
                    }
                    className="input h-8 py-0 text-xs"
                  >
                    {SECTOR_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {SECTOR_STATUS_LABEL[st]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setEditing(s)}
                    className="rounded-md border border-border-strong px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    Editar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border-strong bg-surface/40 p-8 text-center text-sm text-muted-foreground">
            Nenhum setor cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}

function SectorForm({
  eventId,
  organizationId,
  initial,
  existingSlugs,
  onDone,
  onCancel,
}: {
  eventId: string;
  organizationId: string;
  initial: Sector | null;
  existingSlugs: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [capacity, setCapacity] = useState<string>(
    initial?.capacity != null ? String(initial.capacity) : "",
  );
  const [status, setStatus] = useState<SectorStatus>(initial?.status ?? "active");
  const [submitting, setSubmitting] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  async function submit() {
    const nm = name.trim();
    const sl = effectiveSlug.trim();
    if (nm.length < 1 || nm.length > 120) {
      toast.error("Nome inválido.");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sl) || sl.length > 80) {
      toast.error("Slug inválido.");
      return;
    }
    if (existingSlugs.includes(sl)) {
      toast.error("Já existe um setor com esse slug neste evento.");
      return;
    }
    const capNum = capacity.trim() ? Number(capacity) : null;
    if (capNum !== null && (!Number.isInteger(capNum) || capNum <= 0)) {
      toast.error("Capacidade deve ser um inteiro positivo.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user!.id;
      const payload = {
        event_id: eventId,
        organization_id: organizationId,
        name: nm,
        slug: sl,
        description: description.trim() || null,
        capacity: capNum,
        status,
      };
      if (isEdit) {
        const statusChanged = initial!.status !== status;
        const { error } = await supabase
          .from("event_sectors")
          .update(payload)
          .eq("id", initial!.id);
        if (error) throw error;
        await supabase.rpc("record_audit_event", {
          _organization_id: organizationId,
          _actor_user_id: uid,
          _action: statusChanged ? "sector.status_changed" : "sector.updated",
          _entity_type: "event_sector",
          _entity_id: initial!.id,
          _metadata: {
            name: nm,
            slug: sl,
            ...(statusChanged ? { from: initial!.status, to: status } : {}),
          },
        });
        toast.success("Setor atualizado.");
      } else {
        const { data, error } = await supabase
          .from("event_sectors")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        await supabase.rpc("record_audit_event", {
          _organization_id: organizationId,
          _actor_user_id: uid,
          _action: "sector.created",
          _entity_type: "event_sector",
          _entity_id: data.id,
          _metadata: { name: nm, slug: sl, status },
        });
        toast.success("Setor criado.");
      }
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          {isEdit ? "Editar setor" : "Novo setor"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-strong hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Nome
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input mt-2"
          placeholder="Ex.: Área VIP"
          maxLength={120}
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Slug (interno ao evento)
        </span>
        <input
          value={effectiveSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          className="input mt-2"
          maxLength={80}
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Capacidade (opcional)
        </span>
        <input
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="input mt-2"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Descrição (opcional)
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="input mt-2 resize-y"
          maxLength={600}
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Status
        </span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as SectorStatus)}
          className="input mt-2"
        >
          {SECTOR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SECTOR_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border-strong px-4 py-2 text-sm hover:bg-accent"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
