import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrgMembership } from "@/hooks/use-org-membership";
import { OperationsNav } from "@/components/admin/OperationsNav";
import {
  SPACE_OPERATIONAL_STATUSES,
  SPACE_OPERATIONAL_STATUS_LABEL,
  SPACE_OPERATIONAL_STATUS_TONE,
  SPACE_TYPE_STATUSES,
  SPACE_TYPE_STATUS_LABEL,
  SPACE_TYPE_CATEGORIES,
  SPACE_TYPE_CATEGORY_LABEL,
  SPACE_TYPE_CATEGORY_PLURAL,
  SPACE_COMMERCIAL_STATUSES,
  SPACE_COMMERCIAL_STATUS_LABEL,
  SPACE_COMMERCIAL_STATUS_TONE,
  type SpaceOperationalStatus,
  type SpaceTypeStatus,
  type SpaceTypeCategory,
  type SpaceCommercialStatus,
  formatCurrencyBRL,
} from "@/lib/operations";
import type { Database } from "@/integrations/supabase/types";

type Sector = Database["public"]["Tables"]["event_sectors"]["Row"];
type SpaceType = Database["public"]["Tables"]["reservable_space_types"]["Row"];
type Space = Database["public"]["Tables"]["reservable_spaces"]["Row"];

export const Route = createFileRoute("/_authenticated/admin/eventos/$id/espacos")({
  head: () => ({
    meta: [
      { title: "Espaços comerciais — Operação · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SpacesPage,
});

function SpacesPage() {
  const { id: eventId } = Route.useParams();
  const { data: membership } = useOrgMembership();
  const qc = useQueryClient();
  const [editingType, setEditingType] = useState<SpaceType | "new" | null>(null);
  const [expandedType, setExpandedType] = useState<string | null>(null);

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
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const typesQuery = useQuery({
    queryKey: ["admin", "event", eventId, "space-types"],
    queryFn: async (): Promise<SpaceType[]> => {
      const { data, error } = await supabase
        .from("reservable_space_types")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const grouped = useMemo(() => {
    const g: Record<SpaceTypeCategory, SpaceType[]> = {
      camarote: [],
      bistro: [],
      mesa: [],
      outro: [],
    };
    for (const t of typesQuery.data ?? []) g[t.category].push(t);
    return g;
  }, [typesQuery.data]);

  return (
    <div className="p-5 md:p-8">
      <OperationsNav
        eventId={eventId}
        active="spaces"
        eventTitle={eventQuery.data?.title}
      />

      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Espaços comerciais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure Camarotes, Bistrôs e Mesas do evento. Gere unidades em
            lote e controle disponibilidade comercial.
          </p>
        </div>
        {editingType === null && (
          <button
            type="button"
            onClick={() => setEditingType("new")}
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo tipo
          </button>
        )}
      </div>

      {editingType !== null && membership && eventQuery.data && (
        <div className="mt-5 rounded-lg border border-border bg-surface p-5">
          <SpaceTypeForm
            eventId={eventId}
            organizationId={eventQuery.data.organization_id}
            sectors={sectorsQuery.data ?? []}
            initial={editingType === "new" ? null : editingType}
            onDone={() => {
              setEditingType(null);
              qc.invalidateQueries({
                queryKey: ["admin", "event", eventId, "space-types"],
              });
            }}
            onCancel={() => setEditingType(null)}
          />
        </div>
      )}

      {typesQuery.isLoading ? (
        <div className="mt-8 flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (typesQuery.data?.length ?? 0) === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border-strong bg-surface/40 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum tipo de espaço cadastrado ainda.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Comece criando um tipo (ex.: Camarote 10 pessoas) e depois gere as
            unidades em lote.
          </p>
          <button
            type="button"
            onClick={() => setEditingType("new")}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Criar primeiro tipo
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {SPACE_TYPE_CATEGORIES.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              types={grouped[cat]}
              expandedType={expandedType}
              setExpandedType={setExpandedType}
              onEdit={(t) => setEditingType(t)}
              onChanged={() =>
                qc.invalidateQueries({
                  queryKey: ["admin", "event", eventId, "space-types"],
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  types,
  expandedType,
  setExpandedType,
  onEdit,
  onChanged,
}: {
  category: SpaceTypeCategory;
  types: SpaceType[];
  expandedType: string | null;
  setExpandedType: (id: string | null) => void;
  onEdit: (t: SpaceType) => void;
  onChanged: () => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {SPACE_TYPE_CATEGORY_PLURAL[category]}
        </h2>
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {types.length} tipo(s)
        </span>
      </div>
      {types.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-strong bg-surface/30 p-5 text-center text-xs text-muted-foreground">
          Nenhum tipo em {SPACE_TYPE_CATEGORY_PLURAL[category].toLowerCase()}.
        </p>
      ) : (
        <div className="grid gap-3">
          {types.map((t) => (
            <SpaceTypeCard
              key={t.id}
              type={t}
              expanded={expandedType === t.id}
              onToggle={() =>
                setExpandedType(expandedType === t.id ? null : t.id)
              }
              onEdit={() => onEdit(t)}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SpaceTypeCard({
  type,
  expanded,
  onToggle,
  onEdit,
  onChanged,
}: {
  type: SpaceType;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const availabilityQuery = useQuery({
    queryKey: ["admin", "event", type.event_id, "spaces-summary", type.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservable_spaces")
        .select("commercial_status")
        .eq("space_type_id", type.id);
      if (error) throw error;
      const counts: Record<SpaceCommercialStatus, number> = {
        available: 0,
        negotiating: 0,
        reserved: 0,
        confirmed: 0,
        unavailable: 0,
      };
      for (const r of data ?? []) counts[r.commercial_status]++;
      return { total: data?.length ?? 0, counts };
    },
  });

  const summary = availabilityQuery.data;

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 items-start gap-3 text-left"
        >
          {type.image_url ? (
            <img
              src={type.image_url}
              alt=""
              className="h-14 w-14 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {expanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="font-medium">{type.name}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-primary">
                {SPACE_TYPE_CATEGORY_LABEL[type.category]}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {SPACE_TYPE_STATUS_LABEL[type.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {type.capacity_per_unit != null &&
                `cap. ${type.capacity_per_unit} pessoas · `}
              {formatCurrencyBRL(
                type.base_price != null ? Number(type.base_price) : null,
                type.currency,
              )}
            </p>
            {summary && summary.total > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SPACE_COMMERCIAL_STATUSES.map((s) =>
                  summary.counts[s] > 0 ? (
                    <span
                      key={s}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SPACE_COMMERCIAL_STATUS_TONE[s]}`}
                    >
                      {summary.counts[s]} {SPACE_COMMERCIAL_STATUS_LABEL[s]}
                    </span>
                  ) : null,
                )}
              </div>
            )}
          </div>
        </button>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-border-strong px-3 py-1.5 text-xs hover:bg-accent"
          >
            Editar tipo
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border p-4">
          <UnitsPanel type={type} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}

function SpaceTypeForm({
  eventId,
  organizationId,
  sectors,
  initial,
  onDone,
  onCancel,
}: {
  eventId: string;
  organizationId: string;
  sectors: Sector[];
  initial: SpaceType | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<SpaceTypeCategory>(
    initial?.category ?? "camarote",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sectorId, setSectorId] = useState<string>(initial?.sector_id ?? "");
  const [capacityPerUnit, setCapacityPerUnit] = useState<string>(
    initial?.capacity_per_unit != null ? String(initial.capacity_per_unit) : "",
  );
  const [basePrice, setBasePrice] = useState<string>(
    initial?.base_price != null ? String(initial.base_price) : "",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "BRL");
  const [status, setStatus] = useState<SpaceTypeStatus>(
    initial?.status ?? "active",
  );
  const [imageUrl, setImageUrl] = useState<string>(initial?.image_url ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const nm = name.trim();
    if (nm.length < 1 || nm.length > 120) {
      toast.error("Nome inválido.");
      return;
    }
    const cap = capacityPerUnit.trim() ? Number(capacityPerUnit) : null;
    if (cap !== null && (!Number.isInteger(cap) || cap <= 0)) {
      toast.error("Capacidade por unidade inválida.");
      return;
    }
    const price = basePrice.trim() ? Number(basePrice) : null;
    if (price !== null && (Number.isNaN(price) || price < 0)) {
      toast.error("Preço base inválido.");
      return;
    }
    const cur = (currency || "BRL").trim().toUpperCase();
    if (cur.length !== 3) {
      toast.error("Moeda inválida (use ISO 3 letras).");
      return;
    }
    const img = imageUrl.trim();
    if (img && (img.length > 600 || !/^https?:\/\//i.test(img))) {
      toast.error("URL de imagem inválida.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user!.id;
      const payload = {
        event_id: eventId,
        organization_id: organizationId,
        sector_id: sectorId || null,
        name: nm,
        category,
        description: description.trim() || null,
        capacity_per_unit: cap,
        base_price: price,
        currency: cur,
        status,
        image_url: img || null,
      };
      if (isEdit) {
        const statusChanged = initial!.status !== status;
        const { error } = await supabase
          .from("reservable_space_types")
          .update(payload)
          .eq("id", initial!.id);
        if (error) throw error;
        await supabase.rpc("record_audit_event", {
          _organization_id: organizationId,
          _actor_user_id: uid,
          _action: statusChanged
            ? "space_type.status_changed"
            : "space_type.updated",
          _entity_type: "reservable_space_type",
          _entity_id: initial!.id,
          _metadata: {
            name: nm,
            category,
            ...(statusChanged ? { from: initial!.status, to: status } : {}),
          },
        });
        toast.success("Tipo atualizado.");
      } else {
        const { data, error } = await supabase
          .from("reservable_space_types")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        await supabase.rpc("record_audit_event", {
          _organization_id: organizationId,
          _actor_user_id: uid,
          _action: "space_type.created",
          _entity_type: "reservable_space_type",
          _entity_id: data.id,
          _metadata: { name: nm, category, status },
        });
        toast.success("Tipo criado.");
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
          {isEdit ? "Editar tipo" : "Novo tipo de espaço"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-strong hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Nome
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input mt-2"
            placeholder="Ex.: Camarote 10 pessoas"
            maxLength={120}
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Categoria
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SpaceTypeCategory)}
            className="input mt-2"
          >
            {SPACE_TYPE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SPACE_TYPE_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Setor (opcional)
          </span>
          <select
            value={sectorId}
            onChange={(e) => setSectorId(e.target.value)}
            className="input mt-2"
          >
            <option value="">Sem setor</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Capacidade padrão (pessoas)
          </span>
          <input
            type="number"
            min={1}
            value={capacityPerUnit}
            onChange={(e) => setCapacityPerUnit(e.target.value)}
            className="input mt-2"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Preço base
          </span>
          <input
            type="number"
            step="0.01"
            min={0}
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            className="input mt-2"
            placeholder="0,00"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Moeda
          </span>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="input mt-2"
            maxLength={3}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Descrição comercial (opcional)
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="input mt-2 resize-y"
          maxLength={600}
          placeholder="O que este espaço oferece ao cliente"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Imagem (URL — opcional)
        </span>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="input mt-2"
          placeholder="https://..."
          maxLength={600}
        />
        {imageUrl.trim() && /^https?:\/\//i.test(imageUrl) && (
          <img
            src={imageUrl}
            alt=""
            className="mt-2 h-24 w-24 rounded-md object-cover"
          />
        )}
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Status
        </span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as SpaceTypeStatus)}
          className="input mt-2"
        >
          {SPACE_TYPE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SPACE_TYPE_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        Preço base é um dado administrativo. Nenhuma cobrança é feita nesta
        fase.
      </p>
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

function UnitsPanel({
  type,
  onChanged,
}: {
  type: SpaceType;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [genOpen, setGenOpen] = useState(false);
  const key = ["admin", "event", type.event_id, "spaces", type.id];
  const summaryKey = [
    "admin",
    "event",
    type.event_id,
    "spaces-summary",
    type.id,
  ];

  const spacesQuery = useQuery({
    queryKey: key,
    queryFn: async (): Promise<Space[]> => {
      const { data, error } = await supabase
        .from("reservable_spaces")
        .select("*")
        .eq("space_type_id", type.id)
        .order("code", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function changeOperational(sp: Space, next: SpaceOperationalStatus) {
    const { error } = await supabase
      .from("reservable_spaces")
      .update({ operational_status: next })
      .eq("id", sp.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    await supabase.rpc("record_audit_event", {
      _organization_id: sp.organization_id,
      _actor_user_id: userRes.user!.id,
      _action: "space.status_changed",
      _entity_type: "reservable_space",
      _entity_id: sp.id,
      _metadata: { from: sp.operational_status, to: next, code: sp.code },
    });
    qc.invalidateQueries({ queryKey: key });
  }

  async function changeCommercial(sp: Space, next: SpaceCommercialStatus) {
    const { error } = await supabase.rpc("set_space_commercial_status", {
      _space_id: sp.id,
      _new_status: next,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${sp.code}: ${SPACE_COMMERCIAL_STATUS_LABEL[next]}`);
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: summaryKey });
    onChanged();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {spacesQuery.data?.length ?? 0} unidade(s)
        </p>
        <button
          type="button"
          onClick={() => setGenOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-2.5 py-1.5 text-xs hover:bg-accent"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Gerar em lote
        </button>
      </div>

      {genOpen && (
        <div className="mt-3 rounded-md border border-border bg-background p-3">
          <BulkGenerator
            type={type}
            onDone={() => {
              setGenOpen(false);
              qc.invalidateQueries({ queryKey: key });
              qc.invalidateQueries({ queryKey: summaryKey });
              onChanged();
            }}
            onCancel={() => setGenOpen(false)}
          />
        </div>
      )}

      <div className="mt-3">
        {spacesQuery.isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : spacesQuery.data && spacesQuery.data.length > 0 ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {spacesQuery.data.map((sp) => (
              <li
                key={sp.id}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{sp.code}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SPACE_COMMERCIAL_STATUS_TONE[sp.commercial_status]}`}
                      >
                        {SPACE_COMMERCIAL_STATUS_LABEL[sp.commercial_status]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${SPACE_OPERATIONAL_STATUS_TONE[sp.operational_status]}`}
                      >
                        {SPACE_OPERATIONAL_STATUS_LABEL[sp.operational_status]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <label className="block">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                      Comercial
                    </span>
                    <select
                      value={sp.commercial_status}
                      onChange={(e) =>
                        changeCommercial(
                          sp,
                          e.target.value as SpaceCommercialStatus,
                        )
                      }
                      className="input mt-0.5 h-8 py-0 text-xs"
                    >
                      {SPACE_COMMERCIAL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {SPACE_COMMERCIAL_STATUS_LABEL[st]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                      Operacional
                    </span>
                    <select
                      value={sp.operational_status}
                      onChange={(e) =>
                        changeOperational(
                          sp,
                          e.target.value as SpaceOperationalStatus,
                        )
                      }
                      className="input mt-0.5 h-8 py-0 text-xs"
                    >
                      {SPACE_OPERATIONAL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {SPACE_OPERATIONAL_STATUS_LABEL[st]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border-strong p-4 text-center text-xs text-muted-foreground">
            Nenhuma unidade criada. Use "Gerar em lote".
          </p>
        )}
      </div>
    </div>
  );
}

function BulkGenerator({
  type,
  onDone,
  onCancel,
}: {
  type: SpaceType;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [prefix, setPrefix] = useState(type.name);
  const [quantity, setQuantity] = useState<string>("10");
  const [pad, setPad] = useState<string>("2");
  const [startNumber, setStartNumber] = useState<string>("1");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const q = Math.max(1, Math.min(500, Number(quantity) || 0));
  const p = Math.max(1, Math.min(6, Number(pad) || 2));
  const start = Math.max(0, Number(startNumber) || 0);
  const prev = Array.from({ length: Math.min(q, 5) }, (_, i) =>
    `${prefix.trim()} ${String(start + i).padStart(p, "0")}`,
  );

  async function run() {
    if (!prefix.trim() || prefix.length > 40) {
      toast.error("Prefixo inválido (1..40).");
      return;
    }
    if (q < 1 || q > 500) {
      toast.error("Quantidade deve ser entre 1 e 500.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("generate_reservable_spaces", {
        _space_type_id: type.id,
        _quantity: q,
        _prefix: prefix.trim(),
        _pad: p,
        _start_number: start,
      });
      if (error) throw error;
      const row = (data as { created_count: number; skipped_count: number }[])?.[0];
      toast.success(
        `${row?.created_count ?? 0} criadas, ${row?.skipped_count ?? 0} ignoradas (duplicatas).`,
      );
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Gerar unidades em lote
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Prefixo
          </span>
          <input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="input mt-1"
            maxLength={40}
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Quantidade
          </span>
          <input
            type="number"
            min={1}
            max={500}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Dígitos
          </span>
          <input
            type="number"
            min={1}
            max={6}
            value={pad}
            onChange={(e) => setPad(e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Início
          </span>
          <input
            type="number"
            min={0}
            value={startNumber}
            onChange={(e) => setStartNumber(e.target.value)}
            className="input mt-1"
          />
        </label>
      </div>
      <div className="rounded-md border border-border bg-surface/50 p-3">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Prévia
        </p>
        <p className="mt-1 text-xs">
          {prev.join(", ")}
          {q > prev.length ? `, … (+${q - prev.length})` : ""}
        </p>
      </div>
      {!confirming ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-md border border-border-strong px-3 py-1.5 text-xs hover:bg-accent"
          >
            Revisar e gerar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={run}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Confirmar geração de {q} unidade(s)
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}
