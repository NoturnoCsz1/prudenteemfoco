import type { Database } from "@/integrations/supabase/types";

export type VenueMapType = Database["public"]["Enums"]["venue_map_type"];
export type VenueMapStatus = Database["public"]["Enums"]["venue_map_status"];
export type VenueMapAnalysisStatus =
  Database["public"]["Enums"]["venue_map_analysis_status"];
export type VenueUnitType = Database["public"]["Enums"]["venue_unit_type"];
export type VenueUnitStatus = Database["public"]["Enums"]["venue_unit_status"];

export const VENUE_MAP_TYPES: readonly VenueMapType[] = [
  "numbered_units",
  "sector_map",
  "mixed_map",
  "informational_map",
] as const;

export const VENUE_MAP_TYPE_LABEL: Record<VenueMapType, string> = {
  numbered_units: "Unidades numeradas",
  sector_map: "Mapa de setores",
  mixed_map: "Misto (setores + unidades)",
  informational_map: "Informativo (sem reservas)",
};

export const VENUE_MAP_STATUS_LABEL: Record<VenueMapStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

export const VENUE_UNIT_TYPES: readonly VenueUnitType[] = [
  "bistro",
  "table",
  "box",
  "sector",
  "grandstand",
  "lounge",
  "vip",
  "open_bar",
  "pista",
  "front",
  "other",
] as const;

export const VENUE_UNIT_TYPE_LABEL: Record<VenueUnitType, string> = {
  bistro: "Bistrô",
  table: "Mesa",
  box: "Camarote",
  sector: "Setor",
  grandstand: "Arquibancada",
  lounge: "Lounge",
  vip: "Área VIP",
  open_bar: "Open Bar",
  pista: "Pista",
  front: "Front",
  other: "Outro",
};

export const VENUE_UNIT_STATUS_LABEL: Record<VenueUnitStatus, string> = {
  available: "Disponível",
  held: "Em reserva",
  pending_payment: "Aguardando pagamento",
  reserved: "Reservado",
  sold: "Vendido",
  blocked: "Bloqueado",
};

export const VENUE_UNIT_STATUS_COLOR: Record<VenueUnitStatus, string> = {
  available: "bg-emerald-500/20 text-emerald-500 border-emerald-500/40",
  held: "bg-amber-500/20 text-amber-500 border-amber-500/40",
  pending_payment: "bg-amber-500/20 text-amber-500 border-amber-500/40",
  reserved: "bg-blue-500/20 text-blue-500 border-blue-500/40",
  sold: "bg-primary/20 text-primary border-primary/40",
  blocked: "bg-muted text-muted-foreground border-border",
};

export function formatPriceCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
