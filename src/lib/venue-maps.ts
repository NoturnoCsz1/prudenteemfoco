import type { Database } from "@/integrations/supabase/types";

export type VenueMapType = Database["public"]["Enums"]["venue_map_type"];
export type VenueMapStatus = Database["public"]["Enums"]["venue_map_status"];
export type VenueMapAnalysisStatus =
  Database["public"]["Enums"]["venue_map_analysis_status"];
export type VenueUnitType = Database["public"]["Enums"]["venue_unit_type"];
export type VenueUnitStatus = Database["public"]["Enums"]["venue_unit_status"];
export type VenueUnitSaleMode =
  Database["public"]["Enums"]["venue_unit_sale_mode"];

export const VENUE_UNIT_SALE_MODES: readonly VenueUnitSaleMode[] = [
  "disabled",
  "external_link",
  "pix_manual",
] as const;

export const VENUE_UNIT_SALE_MODE_LABEL: Record<VenueUnitSaleMode, string> = {
  disabled: "Sem venda online",
  external_link: "Link externo (ex.: Eventou)",
  pix_manual: "PIX manual",
};

export function isSafeSaleUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
}

export function friendlyVenueUnitError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (
    /duplicate key/i.test(msg) &&
    /uq_venue_units_map_type_label|uq_venue_units_map_label/i.test(msg)
  ) {
    return "Já existe uma unidade desse tipo com esse rótulo neste mapa. Escolha outro número ou rótulo.";
  }
  if (/venue_units_sale_url_scheme/i.test(msg)) {
    return "O link de venda precisa começar com http:// ou https://.";
  }
  if (/venue_units_sale_mode_requires_fields/i.test(msg)) {
    return "Para venda por link externo, informe um link http/https válido.";
  }
  if (/venue_units_x_range|venue_units_y_range/i.test(msg)) {
    return "Posição do hotspot fora do mapa. Tente novamente.";
  }
  if (/venue_units_capacity_pos/i.test(msg)) {
    return "Capacidade deve ser maior que zero.";
  }
  if (/venue_units_price_nonneg/i.test(msg)) {
    return "Preço não pode ser negativo.";
  }
  return "Não foi possível salvar. Verifique os dados e tente novamente.";
}

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
