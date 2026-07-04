import type { Database } from "@/integrations/supabase/types";

export type SectorStatus = Database["public"]["Enums"]["sector_status"];
export type SpaceTypeStatus = Database["public"]["Enums"]["space_type_status"];
export type SpaceOperationalStatus =
  Database["public"]["Enums"]["space_operational_status"];
export type SpaceTypeCategory =
  Database["public"]["Enums"]["space_type_category"];
export type SpaceCommercialStatus =
  Database["public"]["Enums"]["space_commercial_status"];

export const SPACE_TYPE_CATEGORIES: readonly SpaceTypeCategory[] = [
  "camarote",
  "bistro",
  "mesa",
  "outro",
] as const;

export const SPACE_TYPE_CATEGORY_LABEL: Record<SpaceTypeCategory, string> = {
  camarote: "Camarote",
  bistro: "Bistrô",
  mesa: "Mesa",
  outro: "Outro",
};

export const SPACE_TYPE_CATEGORY_PLURAL: Record<SpaceTypeCategory, string> = {
  camarote: "Camarotes",
  bistro: "Bistrôs",
  mesa: "Mesas",
  outro: "Outros",
};

export const SPACE_COMMERCIAL_STATUSES: readonly SpaceCommercialStatus[] = [
  "available",
  "negotiating",
  "reserved",
  "confirmed",
  "unavailable",
] as const;

export const SPACE_COMMERCIAL_STATUS_LABEL: Record<
  SpaceCommercialStatus,
  string
> = {
  available: "Disponível",
  negotiating: "Em negociação",
  reserved: "Reservado",
  confirmed: "Confirmado",
  unavailable: "Indisponível",
};

export const SPACE_COMMERCIAL_STATUS_TONE: Record<
  SpaceCommercialStatus,
  string
> = {
  available: "bg-emerald-500/15 text-emerald-400",
  negotiating: "bg-amber-500/15 text-amber-400",
  reserved: "bg-sky-500/15 text-sky-400",
  confirmed: "bg-primary/20 text-primary",
  unavailable: "bg-destructive/15 text-destructive",
};

export const SECTOR_STATUSES: readonly SectorStatus[] = [
  "active",
  "inactive",
  "archived",
] as const;

export const SECTOR_STATUS_LABEL: Record<SectorStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  archived: "Arquivado",
};

export const SPACE_TYPE_STATUSES: readonly SpaceTypeStatus[] = [
  "active",
  "inactive",
  "archived",
] as const;

export const SPACE_TYPE_STATUS_LABEL: Record<SpaceTypeStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  archived: "Arquivado",
};

export const SPACE_OPERATIONAL_STATUSES: readonly SpaceOperationalStatus[] = [
  "available",
  "blocked",
  "maintenance",
  "inactive",
] as const;

export const SPACE_OPERATIONAL_STATUS_LABEL: Record<
  SpaceOperationalStatus,
  string
> = {
  available: "Disponível",
  blocked: "Bloqueado",
  maintenance: "Manutenção",
  inactive: "Inativo",
};

export const SPACE_OPERATIONAL_STATUS_TONE: Record<
  SpaceOperationalStatus,
  string
> = {
  available: "bg-accent/20 text-accent",
  blocked: "bg-destructive/15 text-destructive",
  maintenance: "bg-primary/15 text-primary",
  inactive: "bg-muted text-muted-foreground",
};

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatCurrencyBRL(
  value: number | null | undefined,
  currency = "BRL",
): string {
  if (value === null || value === undefined) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
