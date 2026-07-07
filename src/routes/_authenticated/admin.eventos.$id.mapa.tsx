import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
  Check,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrgMembership } from "@/hooks/use-org-membership";
import { OperationsNav } from "@/components/admin/OperationsNav";
import {
  VENUE_MAP_TYPES,
  VENUE_MAP_TYPE_LABEL,
  VENUE_MAP_STATUS_LABEL,
  VENUE_UNIT_TYPES,
  VENUE_UNIT_TYPE_LABEL,
  VENUE_UNIT_STATUS_LABEL,
  VENUE_UNIT_STATUS_COLOR,
  VENUE_UNIT_SALE_MODES,
  VENUE_UNIT_SALE_MODE_LABEL,
  formatPriceCents,
  friendlyVenueUnitError,
  isSafeSaleUrl,
  type VenueMapType,
  type VenueMapStatus,
  type VenueUnitType,
  type VenueUnitStatus,
  type VenueUnitSaleMode,
} from "@/lib/venue-maps";
import type { Database } from "@/integrations/supabase/types";

type VenueMapRow = Database["public"]["Tables"]["venue_maps"]["Row"];
type VenueUnitRow = Database["public"]["Tables"]["venue_units"]["Row"];

const BUCKET = "venue-maps";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 100;
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 12 * 1024 * 1024;

const DISPLAY_PREFIX: Record<VenueUnitType, string> = {
  bistro: "B",
  table: "M",
  box: "C",
  vip: "VIP",
  front: "FRONT",
  open_bar: "OPEN",
  pista: "PISTA",
  lounge: "L",
  grandstand: "A",
  sector: "S",
  other: "",
};

function displayLabelFor(type: VenueUnitType, label: string): string {
  const prefix = DISPLAY_PREFIX[type];
  const num = label.match(/\d+/)?.[0] ?? "";
  if (!prefix) return label;
  // Word prefixes: only append number when present
  if (prefix.length > 1) return num ? `${prefix}${num}` : prefix;
  // Single-letter prefixes: use number when available, otherwise fall back to label
  return `${prefix}${num || label}`;
}

export const Route = createFileRoute("/_authenticated/admin/eventos/$id/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa e Reservas — Admin · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VenueMapPage,
});

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}
function pathFromSignedUrl(url: string): string | null {
  const m = url.match(/\/object\/sign\/venue-maps\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function VenueMapPage() {
  const { id: eventId } = Route.useParams();
  const { data: membership } = useOrgMembership();
  const qc = useQueryClient();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const mapsQ = useQuery({
    queryKey: ["admin", "venue-maps", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venue_maps")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as VenueMapRow[];
    },
  });

  const activeMap = useMemo(() => {
    const list = mapsQ.data ?? [];
    if (!list.length) return null;
    return list.find((m) => m.id === selectedMapId) ?? list[0];
  }, [mapsQ.data, selectedMapId]);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden p-4 sm:p-5 md:p-8">
      <div className="w-full min-w-0 max-w-full">
        <OperationsNav eventId={eventId} active="spaces" />
      </div>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0 max-w-full">
          <h1 className="text-xl font-black tracking-tight md:text-2xl break-words">
            Mapa e Reservas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground break-words whitespace-normal leading-relaxed max-w-full">
            Envie o mapa do evento, ajuste os hotspots das unidades reserváveis
            (bistrôs, mesas, camarotes, setores) e defina preços.
          </p>
        </div>
      </div>

      {mapsQ.isLoading ? (
        <div className="mt-8 flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="min-w-0 max-w-full">
            <MapsSidebar
              maps={mapsQ.data ?? []}
              activeId={activeMap?.id ?? null}
              onSelect={setSelectedMapId}
              eventId={eventId}
              organizationId={membership?.organization_id ?? null}
            />
          </div>
          <div className="min-w-0 max-w-full">
            {activeMap ? (
              <MapEditor
                key={activeMap.id}
                map={activeMap}
                onChanged={() => {
                  qc.invalidateQueries({
                    queryKey: ["admin", "venue-maps", eventId],
                  });
                }}
              />
            ) : (
              <EmptyState
                eventId={eventId}
                organizationId={membership?.organization_id ?? null}
                onCreated={(id) => {
                  setSelectedMapId(id);
                  qc.invalidateQueries({
                    queryKey: ["admin", "venue-maps", eventId],
                  });
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Sidebar ----------
function MapsSidebar({
  maps,
  activeId,
  onSelect,
  eventId,
  organizationId,
}: {
  maps: VenueMapRow[];
  activeId: string | null;
  onSelect: (id: string) => void;
  eventId: string;
  organizationId: string | null;
}) {
  const qc = useQueryClient();
  return (
    <aside className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Mapas
        </span>
        <NewMapButton
          eventId={eventId}
          organizationId={organizationId}
          onCreated={(id) => {
            onSelect(id);
            qc.invalidateQueries({
              queryKey: ["admin", "venue-maps", eventId],
            });
          }}
        />
      </div>
      {maps.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Nenhum mapa criado.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {maps.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onSelect(m.id)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                  m.id === activeId
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <div className="font-medium text-foreground">{m.title}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {VENUE_MAP_TYPE_LABEL[m.map_type]} ·{" "}
                  {VENUE_MAP_STATUS_LABEL[m.status]}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function NewMapButton({
  eventId,
  organizationId,
  onCreated,
}: {
  eventId: string;
  organizationId: string | null;
  onCreated: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function create() {
    if (!organizationId || busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("venue_maps")
        .insert({
          organization_id: organizationId,
          event_id: eventId,
          title: "Novo mapa",
          map_type: "numbered_units",
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      onCreated(data.id);
      toast.success("Mapa criado.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      disabled={busy || !organizationId}
      onClick={create}
      className="inline-flex items-center gap-1 rounded-md border border-border-strong px-2 py-1 text-xs font-medium hover:bg-accent disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Plus className="h-3 w-3" />
      )}
      Novo
    </button>
  );
}

function EmptyState({
  eventId,
  organizationId,
  onCreated,
}: {
  eventId: string;
  organizationId: string | null;
  onCreated: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/40" />
      <h2 className="mt-4 text-lg font-semibold">Nenhum mapa cadastrado</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Crie um mapa para enviar a imagem e cadastrar bistrôs, mesas, camarotes
        e setores.
      </p>
      <div className="mt-5 flex justify-center">
        <NewMapButton
          eventId={eventId}
          organizationId={organizationId}
          onCreated={onCreated}
        />
      </div>
    </div>
  );
}

// ---------- Map Editor ----------
function MapEditor({
  map,
  onChanged,
}: {
  map: VenueMapRow;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const unitsQ = useQuery({
    queryKey: ["admin", "venue-units", map.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venue_units")
        .select("*")
        .eq("venue_map_id", map.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as VenueUnitRow[];
    },
  });

  const [placingType, setPlacingType] = useState<VenueUnitType | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  function invalidateUnits() {
    qc.invalidateQueries({ queryKey: ["admin", "venue-units", map.id] });
  }

  const unitsList = unitsQ.data ?? [];

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 md:space-y-6">
      <details className="group rounded-lg border border-border open:pb-2" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 md:px-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Configurações do mapa
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
        </summary>
        <div className="px-3 pb-2 md:px-4">
          <MapHeader map={map} onChanged={onChanged} />
        </div>
      </details>

      <PlacingBar
        placingType={placingType}
        setPlacingType={setPlacingType}
        selectedCount={selectedIds.size}
        onBulkApply={async (patch) => {
          if (selectedIds.size === 0) return;
          const { error } = await supabase
            .from("venue_units")
            .update(patch)
            .in("id", Array.from(selectedIds));
          if (error) toast.error(friendlyVenueUnitError(error));
          else {
            invalidateUnits();
            toast.success("Aplicado às unidades selecionadas.");
          }
        }}
        onBulkDelete={async () => {
          if (selectedIds.size === 0) return;
          if (!confirm(`Excluir ${selectedIds.size} unidade(s)?`)) return;
          const { error } = await supabase
            .from("venue_units")
            .delete()
            .in("id", Array.from(selectedIds));
          if (error) toast.error(friendlyVenueUnitError(error));
          else {
            setSelectedIds(new Set());
            invalidateUnits();
          }
        }}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      <MapImageEditor
        map={map}
        units={unitsList}
        placingType={placingType}
        selectedIds={selectedIds}
        onCancelPlacing={() => setPlacingType(null)}
        onToggleSelect={(id) => {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
              const u = unitsList.find((x) => x.id === id);
              if (u) {
                toast(
                  `Editando ${VENUE_UNIT_TYPE_LABEL[u.type as VenueUnitType]} ${u.label}`,
                );
              }
            }
            return next;
          });
        }}
        onPlace={async (xPercent, yPercent) => {
          if (!placingType) return;
          const currentType = placingType;
          const nextLabel = nextLabelFor(unitsList, currentType);
          const { error } = await supabase.from("venue_units").insert({
            organization_id: map.organization_id,
            event_id: map.event_id,
            venue_map_id: map.id,
            type: currentType,
            label: nextLabel,
            number: parseInt(nextLabel, 10) || null,
            x_percent: xPercent,
            y_percent: yPercent,
            status: "blocked",
          });
          if (error) toast.error(friendlyVenueUnitError(error));
          else {
            invalidateUnits();
            toast.success(
              `${VENUE_UNIT_TYPE_LABEL[currentType]} ${nextLabel} adicionado ao mapa.`,
            );
          }
        }}
        onMove={async (id, xPercent, yPercent) => {
          const { error } = await supabase
            .from("venue_units")
            .update({ x_percent: xPercent, y_percent: yPercent })
            .eq("id", id);
          if (error) toast.error(friendlyVenueUnitError(error));
          else invalidateUnits();
        }}
      />

      <UnitsList
        units={unitsList}
        loading={unitsQ.isLoading}
        selectedIds={selectedIds}
        editingId={editingId}
        setEditingId={setEditingId}
        onToggleSelect={(id) => {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
        onSave={async (id, patch) => {
          const { error } = await supabase
            .from("venue_units")
            .update(patch)
            .eq("id", id);
          if (error) toast.error(friendlyVenueUnitError(error));
          else {
            setEditingId(null);
            invalidateUnits();
          }
        }}
        onDelete={async (id) => {
          if (!confirm("Excluir esta unidade?")) return;
          const { error } = await supabase
            .from("venue_units")
            .delete()
            .eq("id", id);
          if (error) toast.error(friendlyVenueUnitError(error));
          else invalidateUnits();
        }}
      />
    </div>
  );
}

function nextLabelFor(units: VenueUnitRow[], type: VenueUnitType): string {
  const numbers = units
    .filter((u) => u.type === type)
    .map((u) => u.number ?? parseInt(u.label, 10))
    .filter((n) => Number.isFinite(n)) as number[];
  const max = numbers.length ? Math.max(...numbers) : 0;
  return String(max + 1);
}

// ---------- Header (metadata + delete map) ----------
function MapHeader({
  map,
  onChanged,
}: {
  map: VenueMapRow;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(map.title);
  const [mapType, setMapType] = useState<VenueMapType>(map.map_type);
  const [status, setStatus] = useState<VenueMapStatus>(map.status);
  const [saving, setSaving] = useState(false);
  const dirty =
    title !== map.title || mapType !== map.map_type || status !== map.status;

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("venue_maps")
      .update({ title, map_type: mapType, status })
      .eq("id", map.id);
    setSaving(false);
    if (error) toast.error(friendlyVenueUnitError(error));
    else {
      toast.success("Mapa atualizado.");
      onChanged();
    }
  }

  async function del() {
    if (!confirm("Excluir este mapa e todas as unidades?")) return;
    const { error } = await supabase.from("venue_maps").delete().eq("id", map.id);
    if (error) toast.error(friendlyVenueUnitError(error));
    else {
      toast.success("Mapa excluído.");
      onChanged();
    }
  }

  return (
    <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-3 rounded-lg border border-border p-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-end md:gap-4 md:p-4">
      <label className="block min-w-0 max-w-full">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Título do mapa
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input mt-1 w-full min-w-0 max-w-full"
          maxLength={120}
        />
      </label>
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Tipo
        </span>
        <select
          value={mapType}
          onChange={(e) => setMapType(e.target.value as VenueMapType)}
          className="input mt-1"
        >
          {VENUE_MAP_TYPES.map((t) => (
            <option key={t} value={t}>
              {VENUE_MAP_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Status
        </span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as VenueMapStatus)}
          className="input mt-1"
        >
          {(["draft", "published", "archived"] as VenueMapStatus[]).map((s) => (
            <option key={s} value={s}>
              {VENUE_MAP_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Salvar
        </button>
        <button
          type="button"
          onClick={del}
          aria-label="Excluir mapa"
          className="inline-flex items-center gap-1 rounded-md border border-border-strong px-2.5 py-2 text-xs text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------- Image + hotspots ----------
function MapImageEditor({
  map,
  units,
  placingType,
  selectedIds,
  onCancelPlacing,
  onToggleSelect,
  onPlace,
  onMove,
}: {
  map: VenueMapRow;
  units: VenueUnitRow[];
  placingType: VenueUnitType | null;
  selectedIds: Set<string>;
  onCancelPlacing: () => void;
  onToggleSelect: (id: string) => void;
  onPlace: (xPercent: number, yPercent: number) => void;
  onMove: (id: string, xPercent: number, yPercent: number) => void;
}) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);

  async function handleFile(file: File) {
    if (!ACCEPTED_MIME.includes(file.type as (typeof ACCEPTED_MIME)[number])) {
      toast.error("Formato inválido. Use JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo maior que 12 MB.");
      return;
    }
    setUploading(true);
    const previousPath = map.image_storage_path;
    try {
      const uuid = crypto.randomUUID();
      const path = `${map.organization_id}/${map.event_id}/${uuid}.${extFromMime(file.type)}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr || !signed) throw signErr ?? new Error("URL");
      const { error: updErr } = await supabase
        .from("venue_maps")
        .update({ image_url: signed.signedUrl, image_storage_path: path })
        .eq("id", map.id);
      if (updErr) throw updErr;
      if (previousPath && previousPath !== path) {
        await supabase.storage.from(BUCKET).remove([previousPath]);
      }
      toast.success("Imagem enviada.");
      // reload map row
      window.location.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function pctFromEvent(e: React.MouseEvent | React.TouchEvent) {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      const t = e.touches[0] ?? e.changedTouches[0];
      if (!t) return null;
      clientX = t.clientX;
      clientY = t.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }

  function handleContainerClick(e: React.MouseEvent) {
    if (!placingType || dragId) return;
    const p = pctFromEvent(e);
    if (!p) return;
    onPlace(Number(p.x.toFixed(2)), Number(p.y.toFixed(2)));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {map.image_url
            ? placingType
              ? `Adicionar ${VENUE_UNIT_TYPE_LABEL[placingType]} — toque no ponto correspondente do mapa.`
              : "Arraste os pontos para reposicionar. Toque num ponto para selecionar."
            : "Envie a imagem do mapa (JPG/PNG/WebP, máx. 12 MB). Recomendado 1920×1080 px."}
        </p>
        <div className="flex items-center gap-2">
          {placingType && (
            <button
              type="button"
              onClick={onCancelPlacing}
              className="inline-flex items-center gap-1 rounded-md border border-border-strong px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" /> Cancelar colocação
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {map.image_url ? "Substituir imagem" : "Enviar imagem"}
          </button>
        </div>
      </div>
      <div className="mx-auto w-full md:max-h-[70vh] md:flex md:justify-center">
        <div
          ref={containerRef}
          onClick={handleContainerClick}
          className={`relative w-full max-w-full overflow-hidden rounded-lg border border-border bg-muted md:max-h-[70vh] ${
            placingType ? "cursor-crosshair" : ""
          }`}
          style={{ aspectRatio: naturalRatio ?? 16 / 9 }}
        >
          {map.image_url ? (
            <img
              src={map.image_url}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                  setNaturalRatio(img.naturalWidth / img.naturalHeight);
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
        {units
          .filter((u) => u.x_percent != null && u.y_percent != null)
          .map((u) => (
            <Hotspot
              isMobile={isMobile}
              key={u.id}
              unit={u}
              selected={selectedIds.has(u.id)}
              onPointerDown={() => setDragId(u.id)}
              onPointerMove={(e) => {
                if (dragId !== u.id) return;
                const p = pctFromEvent(e as unknown as React.MouseEvent);
                if (p) {
                  // preview only — commit on release
                  const el = document.getElementById(`hotspot-${u.id}`);
                  if (el) {
                    el.style.left = `${p.x}%`;
                    el.style.top = `${p.y}%`;
                  }
                }
              }}
              onPointerUp={(e) => {
                if (dragId !== u.id) return;
                const p = pctFromEvent(e as unknown as React.MouseEvent);
                setDragId(null);
                if (p) {
                  onMove(u.id, Number(p.x.toFixed(2)), Number(p.y.toFixed(2)));
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!dragId) onToggleSelect(u.id);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Hotspot({
  unit,
  selected,
  isMobile,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClick,
}: {
  unit: VenueUnitRow;
  selected: boolean;
  isMobile: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  const display = displayLabelFor(unit.type as VenueUnitType, unit.label);
  return (
    <button
      type="button"
      id={`hotspot-${unit.id}`}
      onClick={onClick}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture(e.pointerId);
        onPointerDown(e);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`absolute -translate-x-1/2 -translate-y-1/2 touch-none ${
        selected ? "z-20" : "z-10"
      }`}
      style={{
        left: `${unit.x_percent}%`,
        top: `${unit.y_percent}%`,
        minWidth: isMobile ? 44 : undefined,
        minHeight: isMobile ? 44 : undefined,
      }}
      aria-label={`${VENUE_UNIT_TYPE_LABEL[unit.type as VenueUnitType]} ${unit.label}`}
    >
      {/* Visual pill centered inside the (potentially larger) tap target */}
      <span
        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.1em] shadow-md ${
          VENUE_UNIT_STATUS_COLOR[unit.status as VenueUnitStatus]
        } ${
          selected
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
            : ""
        }`}
      >
        {display}
      </span>
    </button>
  );
}


// ---------- Placing / bulk bar ----------
function PlacingBar({
  placingType,
  setPlacingType,
  selectedCount,
  onBulkApply,
  onBulkDelete,
  onClearSelection,
}: {
  placingType: VenueUnitType | null;
  setPlacingType: (t: VenueUnitType | null) => void;
  selectedCount: number;
  onBulkApply: (patch: {
    price_cents?: number | null;
    capacity?: number | null;
    status?: VenueUnitStatus;
    active?: boolean;
    sale_mode?: VenueUnitSaleMode;
    sale_url?: string | null;
    pix_key?: string | null;
    pix_instructions?: string | null;
  }) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onClearSelection: () => void;
}) {
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkCapacity, setBulkCapacity] = useState("");
  const [bulkStatus, setBulkStatus] = useState<VenueUnitStatus | "">("");
  const [bulkSaleMode, setBulkSaleMode] = useState<VenueUnitSaleMode | "">("");
  const [bulkSaleUrl, setBulkSaleUrl] = useState("");
  const [bulkPixKey, setBulkPixKey] = useState("");
  const [bulkPixInstructions, setBulkPixInstructions] = useState("");

  return (
    <div className="sticky top-0 z-20 w-full min-w-0 max-w-full rounded-lg border border-border bg-background/95 p-3 backdrop-blur md:static md:p-4">
      <div className="flex min-w-0 max-w-full items-center gap-2">
        <span className="hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground md:inline">
          Colocar no mapa:
        </span>
        <div className="w-full min-w-0 max-w-full overflow-hidden">
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto overscroll-x-contain px-1 py-0.5 whitespace-nowrap md:flex-wrap md:overflow-visible md:whitespace-normal">
            {VENUE_UNIT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPlacingType(placingType === t ? null : t)}
                className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  placingType === t
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {VENUE_UNIT_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        {placingType && (
          <button
            type="button"
            onClick={() => setPlacingType(null)}
            className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-border-strong px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" /> Cancelar
          </button>
        )}
      </div>



      {selectedCount > 0 && (
        <div className="mt-4 grid gap-3 border-t border-border pt-3 md:grid-cols-[1fr_1fr_1fr_auto_auto]">
          <div className="md:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {selectedCount} selecionada(s) — ações em massa
            </p>
          </div>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Preço (R$)
            </span>
            <input
              value={bulkPrice}
              onChange={(e) => setBulkPrice(e.target.value)}
              type="number"
              min={0}
              step="0.01"
              className="input mt-1"
              placeholder="150,00"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Capacidade
            </span>
            <input
              value={bulkCapacity}
              onChange={(e) => setBulkCapacity(e.target.value)}
              type="number"
              min={1}
              className="input mt-1"
              placeholder="4"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Status
            </span>
            <select
              value={bulkStatus}
              onChange={(e) =>
                setBulkStatus(e.target.value as VenueUnitStatus | "")
              }
              className="input mt-1"
            >
              <option value="">— manter —</option>
              {(Object.keys(VENUE_UNIT_STATUS_LABEL) as VenueUnitStatus[]).map(
                (s) => (
                  <option key={s} value={s}>
                    {VENUE_UNIT_STATUS_LABEL[s]}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="block md:col-span-4">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Canal de venda
            </span>
            <select
              value={bulkSaleMode}
              onChange={(e) =>
                setBulkSaleMode(e.target.value as VenueUnitSaleMode | "")
              }
              className="input mt-1"
            >
              <option value="">— manter —</option>
              {VENUE_UNIT_SALE_MODES.map((m) => (
                <option key={m} value={m}>
                  {VENUE_UNIT_SALE_MODE_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
          {bulkSaleMode === "external_link" && (
            <label className="block md:col-span-4">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Link de venda (http/https)
              </span>
              <input
                value={bulkSaleUrl}
                onChange={(e) => setBulkSaleUrl(e.target.value)}
                className="input mt-1"
                placeholder="https://eventou.com.br/..."
                inputMode="url"
              />
            </label>
          )}
          {bulkSaleMode === "pix_manual" && (
            <>
              <label className="block md:col-span-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Chave PIX
                </span>
                <input
                  value={bulkPixKey}
                  onChange={(e) => setBulkPixKey(e.target.value)}
                  className="input mt-1"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Instruções
                </span>
                <input
                  value={bulkPixInstructions}
                  onChange={(e) => setBulkPixInstructions(e.target.value)}
                  className="input mt-1"
                />
              </label>
            </>
          )}
          <button
            type="button"
            onClick={async () => {
              const patch: {
                price_cents?: number | null;
                capacity?: number | null;
                status?: VenueUnitStatus;
                sale_mode?: VenueUnitSaleMode;
                sale_url?: string | null;
                pix_key?: string | null;
                pix_instructions?: string | null;
              } = {};
              if (bulkPrice.trim()) {
                const n = parseFloat(bulkPrice.replace(",", "."));
                if (Number.isFinite(n))
                  patch.price_cents = Math.round(n * 100);
              }
              if (bulkCapacity.trim()) {
                const n = parseInt(bulkCapacity, 10);
                if (Number.isFinite(n) && n > 0) patch.capacity = n;
              }
              if (bulkStatus) patch.status = bulkStatus;
              if (bulkSaleMode) {
                if (bulkSaleMode === "external_link") {
                  const url = bulkSaleUrl.trim();
                  if (!isSafeSaleUrl(url)) {
                    toast.error(
                      "Link de venda inválido. Use http:// ou https://.",
                    );
                    return;
                  }
                  patch.sale_mode = "external_link";
                  patch.sale_url = url;
                  patch.pix_key = null;
                  patch.pix_instructions = null;
                } else if (bulkSaleMode === "pix_manual") {
                  patch.sale_mode = "pix_manual";
                  patch.sale_url = null;
                  patch.pix_key = bulkPixKey.trim() || null;
                  patch.pix_instructions =
                    bulkPixInstructions.trim() || null;
                } else {
                  patch.sale_mode = "disabled";
                  patch.sale_url = null;
                  patch.pix_key = null;
                  patch.pix_instructions = null;
                }
              }
              if (Object.keys(patch).length === 0) {
                toast.error("Preencha ao menos um campo.");
                return;
              }
              await onBulkApply(patch);
              setBulkPrice("");
              setBulkCapacity("");
              setBulkStatus("");
              setBulkSaleMode("");
              setBulkSaleUrl("");
              setBulkPixKey("");
              setBulkPixInstructions("");
            }}
            className="inline-flex items-center gap-1.5 self-end rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground"
          >
            <Check className="h-3.5 w-3.5" /> Aplicar
          </button>
          <div className="flex items-center gap-2 self-end">
            <button
              type="button"
              onClick={onBulkDelete}
              className="rounded-md border border-destructive/40 px-2.5 py-2 text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              className="rounded-md border border-border-strong px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Units list ----------
function UnitsList({
  units,
  loading,
  selectedIds,
  editingId,
  setEditingId,
  onToggleSelect,
  onSave,
  onDelete,
}: {
  units: VenueUnitRow[];
  loading: boolean;
  selectedIds: Set<string>;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onToggleSelect: (id: string) => void;
  onSave: (
    id: string,
    patch: Partial<
      Pick<
        VenueUnitRow,
        | "label"
        | "number"
        | "type"
        | "sector"
        | "capacity"
        | "price_cents"
        | "status"
        | "active"
        | "sale_mode"
        | "sale_url"
        | "pix_key"
        | "pix_instructions"
      >
    >,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (units.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhuma unidade cadastrada. Selecione um tipo acima e clique no mapa para
        criar.
      </div>
    );
  }
  return (
    <>
      {/* Mobile: card list */}
      <ul className="space-y-2 md:hidden">
        {units.map((u) => {
          const isEditing = editingId === u.id;
          return (
            <li
              key={u.id}
              className="rounded-lg border border-border bg-surface-elevated/40"
            >
              {!isEditing ? (
                <div className="flex items-start gap-3 p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.id)}
                    onChange={() => onToggleSelect(u.id)}
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingId(u.id)}
                    className="flex min-w-0 flex-1 flex-col items-start text-left"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {VENUE_UNIT_TYPE_LABEL[u.type as VenueUnitType]}{" "}
                        {u.label}
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                          VENUE_UNIT_STATUS_COLOR[u.status as VenueUnitStatus]
                        }`}
                      >
                        {VENUE_UNIT_STATUS_LABEL[u.status as VenueUnitStatus]}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span>{formatPriceCents(u.price_cents)}</span>
                      {u.sector && <span>· {u.sector}</span>}
                      {u.capacity != null && <span>· {u.capacity} lug.</span>}
                      <span>
                        ·{" "}
                        {
                          VENUE_UNIT_SALE_MODE_LABEL[
                            (u.sale_mode as VenueUnitSaleMode) ?? "disabled"
                          ]
                        }
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(u.id)}
                    aria-label="Excluir"
                    className="shrink-0 text-destructive hover:opacity-80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="p-3">
                  <MobileUnitEditor
                    unit={u}
                    onSave={(patch) => onSave(u.id, patch)}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => onDelete(u.id)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Desktop / tablet: full table */}
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="w-8 px-3 py-2"></th>
              <th className="px-3 py-2">Rótulo</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Setor</th>
              <th className="px-3 py-2">Cap.</th>
              <th className="px-3 py-2">Preço</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Venda</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <UnitRow
                key={u.id}
                unit={u}
                selected={selectedIds.has(u.id)}
                editing={editingId === u.id}
                onToggleSelect={() => onToggleSelect(u.id)}
                onStartEdit={() => setEditingId(u.id)}
                onCancelEdit={() => setEditingId(null)}
                onSave={(patch) => onSave(u.id, patch)}
                onDelete={() => onDelete(u.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UnitRow({
  unit,
  selected,
  editing,
  onToggleSelect,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  unit: VenueUnitRow;
  selected: boolean;
  editing: boolean;
  onToggleSelect: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (
    patch: Partial<
      Pick<
        VenueUnitRow,
        | "label"
        | "number"
        | "type"
        | "sector"
        | "capacity"
        | "price_cents"
        | "status"
        | "active"
        | "sale_mode"
        | "sale_url"
        | "pix_key"
        | "pix_instructions"
      >
    >,
  ) => Promise<void>;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(unit.label);
  const [type, setType] = useState<VenueUnitType>(unit.type as VenueUnitType);
  const [sector, setSector] = useState(unit.sector ?? "");
  const [capacity, setCapacity] = useState(
    unit.capacity != null ? String(unit.capacity) : "",
  );
  const [price, setPrice] = useState(
    unit.price_cents != null ? (unit.price_cents / 100).toString() : "",
  );
  const [status, setStatus] = useState<VenueUnitStatus>(
    unit.status as VenueUnitStatus,
  );
  const [saleMode, setSaleMode] = useState<VenueUnitSaleMode>(
    (unit.sale_mode as VenueUnitSaleMode) ?? "disabled",
  );
  const [saleUrl, setSaleUrl] = useState(unit.sale_url ?? "");
  const [pixKey, setPixKey] = useState(unit.pix_key ?? "");
  const [pixInstructions, setPixInstructions] = useState(
    unit.pix_instructions ?? "",
  );

  if (!editing) {
    return (
      <tr className="border-t border-border">
        <td className="px-3 py-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4"
          />
        </td>
        <td className="px-3 py-2 font-semibold">{unit.label}</td>
        <td className="px-3 py-2">
          {VENUE_UNIT_TYPE_LABEL[unit.type as VenueUnitType]}
        </td>
        <td className="px-3 py-2 text-muted-foreground">
          {unit.sector ?? "—"}
        </td>
        <td className="px-3 py-2 text-muted-foreground">
          {unit.capacity ?? "—"}
        </td>
        <td className="px-3 py-2 text-muted-foreground">
          {formatPriceCents(unit.price_cents)}
        </td>
        <td className="px-3 py-2">
          <span
            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
              VENUE_UNIT_STATUS_COLOR[unit.status as VenueUnitStatus]
            }`}
          >
            {VENUE_UNIT_STATUS_LABEL[unit.status as VenueUnitStatus]}
          </span>
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground">
          {
            VENUE_UNIT_SALE_MODE_LABEL[
              (unit.sale_mode as VenueUnitSaleMode) ?? "disabled"
            ]
          }
        </td>
        <td className="px-3 py-2 text-right">
          <button
            type="button"
            onClick={onStartEdit}
            className="text-xs font-medium text-primary hover:underline"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Excluir"
            className="ml-2 text-destructive hover:opacity-80"
          >
            <Trash2 className="inline h-3.5 w-3.5" />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <>
    <tr className="border-t border-border bg-accent/30">
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="input"
          maxLength={40}
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as VenueUnitType)}
          className="input"
        >
          {VENUE_UNIT_TYPES.map((t) => (
            <option key={t} value={t}>
              {VENUE_UNIT_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="input"
          maxLength={40}
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          type="number"
          min={1}
          className="input w-20"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          min={0}
          step="0.01"
          className="input w-28"
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as VenueUnitStatus)}
          className="input"
        >
          {(Object.keys(VENUE_UNIT_STATUS_LABEL) as VenueUnitStatus[]).map(
            (s) => (
              <option key={s} value={s}>
                {VENUE_UNIT_STATUS_LABEL[s]}
              </option>
            ),
          )}
        </select>
      </td>
      <td className="px-3 py-2">
        <select
          value={saleMode}
          onChange={(e) => setSaleMode(e.target.value as VenueUnitSaleMode)}
          className="input"
        >
          {VENUE_UNIT_SALE_MODES.map((m) => (
            <option key={m} value={m}>
              {VENUE_UNIT_SALE_MODE_LABEL[m]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 text-right align-top">
        <button
          type="button"
          onClick={async () => {
            const parsedNumber = parseInt(label, 10);
            const parsedCap = capacity ? parseInt(capacity, 10) : null;
            const parsedPrice = price
              ? Math.round(parseFloat(price.replace(",", ".")) * 100)
              : null;
            const trimmedUrl = saleUrl.trim();
            if (saleMode === "external_link" && !isSafeSaleUrl(trimmedUrl)) {
              toast.error(
                "Link de venda inválido. Use uma URL começando com http:// ou https://.",
              );
              return;
            }
            await onSave({
              label: label.trim(),
              number: Number.isFinite(parsedNumber) ? parsedNumber : null,
              type,
              sector: sector.trim() || null,
              capacity:
                parsedCap && Number.isFinite(parsedCap) && parsedCap > 0
                  ? parsedCap
                  : null,
              price_cents:
                parsedPrice != null && Number.isFinite(parsedPrice)
                  ? parsedPrice
                  : null,
              status,
              sale_mode: saleMode,
              sale_url: saleMode === "external_link" ? trimmedUrl : null,
              pix_key:
                saleMode === "pix_manual" ? pixKey.trim() || null : null,
              pix_instructions:
                saleMode === "pix_manual"
                  ? pixInstructions.trim() || null
                  : null,
            });
          }}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onCancelEdit}
          className="ml-2 text-xs text-muted-foreground hover:underline"
        >
          Cancelar
        </button>
      </td>
    </tr>
    {(saleMode === "external_link" || saleMode === "pix_manual") && (
      <tr className="border-t border-border/50 bg-accent/20">
        <td colSpan={9} className="px-3 py-3">
          {saleMode === "external_link" ? (
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Link de venda (http/https)
              </span>
              <input
                value={saleUrl}
                onChange={(e) => setSaleUrl(e.target.value)}
                className="input mt-1 w-full"
                placeholder="https://eventou.com.br/evento/..."
                inputMode="url"
              />
            </label>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Chave PIX
                </span>
                <input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="input mt-1 w-full"
                  placeholder="email@dominio.com / CPF / chave aleatória"
                />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Instruções ao comprador
                </span>
                <input
                  value={pixInstructions}
                  onChange={(e) => setPixInstructions(e.target.value)}
                  className="input mt-1 w-full"
                  placeholder="Envie o comprovante para o WhatsApp..."
                />
              </label>
              <p className="text-[11px] text-muted-foreground md:col-span-2">
                A confirmação do pagamento ainda será manual nesta fase.
              </p>
            </div>
          )}
        </td>
      </tr>
    )}
    </>
  );
}

// ---------- Mobile unit editor ----------
function MobileUnitEditor({
  unit,
  onSave,
  onCancel,
  onDelete,
}: {
  unit: VenueUnitRow;
  onSave: (
    patch: Partial<
      Pick<
        VenueUnitRow,
        | "label"
        | "number"
        | "type"
        | "sector"
        | "capacity"
        | "price_cents"
        | "status"
        | "sale_mode"
        | "sale_url"
        | "pix_key"
        | "pix_instructions"
      >
    >,
  ) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(unit.label);
  const [type, setType] = useState<VenueUnitType>(unit.type as VenueUnitType);
  const [sector, setSector] = useState(unit.sector ?? "");
  const [capacity, setCapacity] = useState(
    unit.capacity != null ? String(unit.capacity) : "",
  );
  const [price, setPrice] = useState(
    unit.price_cents != null ? (unit.price_cents / 100).toString() : "",
  );
  const [status, setStatus] = useState<VenueUnitStatus>(
    unit.status as VenueUnitStatus,
  );
  const [saleMode, setSaleMode] = useState<VenueUnitSaleMode>(
    (unit.sale_mode as VenueUnitSaleMode) ?? "disabled",
  );
  const [saleUrl, setSaleUrl] = useState(unit.sale_url ?? "");
  const [pixKey, setPixKey] = useState(unit.pix_key ?? "");
  const [pixInstructions, setPixInstructions] = useState(
    unit.pix_instructions ?? "",
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Editando {VENUE_UNIT_TYPE_LABEL[unit.type as VenueUnitType]}{" "}
          {unit.label}
        </p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fechar"
          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Rótulo
          </span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input mt-1"
            maxLength={40}
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Tipo
          </span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as VenueUnitType)}
            className="input mt-1"
          >
            {VENUE_UNIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {VENUE_UNIT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block col-span-2">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Setor
          </span>
          <input
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="input mt-1"
            maxLength={40}
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Capacidade
          </span>
          <input
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            type="number"
            min={1}
            className="input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Preço (R$)
          </span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            min={0}
            step="0.01"
            className="input mt-1"
          />
        </label>
        <label className="block col-span-2">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as VenueUnitStatus)}
            className="input mt-1"
          >
            {(Object.keys(VENUE_UNIT_STATUS_LABEL) as VenueUnitStatus[]).map(
              (s) => (
                <option key={s} value={s}>
                  {VENUE_UNIT_STATUS_LABEL[s]}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="block col-span-2">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Canal de venda
          </span>
          <select
            value={saleMode}
            onChange={(e) => setSaleMode(e.target.value as VenueUnitSaleMode)}
            className="input mt-1"
          >
            {VENUE_UNIT_SALE_MODES.map((m) => (
              <option key={m} value={m}>
                {VENUE_UNIT_SALE_MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        {saleMode === "external_link" && (
          <label className="block col-span-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Link (http/https)
            </span>
            <input
              value={saleUrl}
              onChange={(e) => setSaleUrl(e.target.value)}
              className="input mt-1"
              placeholder="https://eventou.com.br/..."
              inputMode="url"
            />
          </label>
        )}
        {saleMode === "pix_manual" && (
          <>
            <label className="block col-span-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Chave PIX
              </span>
              <input
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                className="input mt-1"
              />
            </label>
            <label className="block col-span-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Instruções
              </span>
              <input
                value={pixInstructions}
                onChange={(e) => setPixInstructions(e.target.value)}
                className="input mt-1"
              />
            </label>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2.5 py-2 text-xs text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border-strong px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={async () => {
              const parsedNumber = parseInt(label, 10);
              const parsedCap = capacity ? parseInt(capacity, 10) : null;
              const parsedPrice = price
                ? Math.round(parseFloat(price.replace(",", ".")) * 100)
                : null;
              const trimmedUrl = saleUrl.trim();
              if (saleMode === "external_link" && !isSafeSaleUrl(trimmedUrl)) {
                toast.error(
                  "Link de venda inválido. Use uma URL http:// ou https://.",
                );
                return;
              }
              await onSave({
                label: label.trim(),
                number: Number.isFinite(parsedNumber) ? parsedNumber : null,
                type,
                sector: sector.trim() || null,
                capacity:
                  parsedCap && Number.isFinite(parsedCap) && parsedCap > 0
                    ? parsedCap
                    : null,
                price_cents:
                  parsedPrice != null && Number.isFinite(parsedPrice)
                    ? parsedPrice
                    : null,
                status,
                sale_mode: saleMode,
                sale_url: saleMode === "external_link" ? trimmedUrl : null,
                pix_key:
                  saleMode === "pix_manual" ? pixKey.trim() || null : null,
                pix_instructions:
                  saleMode === "pix_manual"
                    ? pixInstructions.trim() || null
                    : null,
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground"
          >
            <Save className="h-3.5 w-3.5" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
