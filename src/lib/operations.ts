import type { Database } from "@/integrations/supabase/types";

export type SectorStatus = Database["public"]["Enums"]["sector_status"];
export type SpaceTypeStatus = Database["public"]["Enums"]["space_type_status"];
export type SpaceOperationalStatus =
  Database["public"]["Enums"]["space_operational_status"];

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
