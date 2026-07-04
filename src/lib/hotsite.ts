import type { Database } from "@/integrations/supabase/types";

export type SponsorCategory = Database["public"]["Enums"]["event_sponsor_category"];
export type BannerPlacement = Database["public"]["Enums"]["event_banner_placement"];
export type NewsStatus = Database["public"]["Enums"]["event_news_status"];
export type CommercialLinkType =
  Database["public"]["Enums"]["event_commercial_link_type"];
export type HotsiteClickKind = Database["public"]["Enums"]["hotsite_click_kind"];

export const SPONSOR_CATEGORIES: readonly SponsorCategory[] = [
  "master",
  "sponsor",
  "supporter",
  "partner",
  "realization",
  "production",
  "media",
] as const;

export const SPONSOR_CATEGORY_LABEL: Record<SponsorCategory, string> = {
  master: "Patrocinador Master",
  sponsor: "Patrocinadores",
  supporter: "Apoiadores",
  partner: "Parceiros",
  realization: "Realização",
  production: "Produção",
  media: "Mídia Oficial",
};

export const BANNER_PLACEMENTS: readonly BannerPlacement[] = [
  "below_hero",
  "between_lineup_tickets",
  "before_experiences",
  "before_footer",
] as const;

export const BANNER_PLACEMENT_LABEL: Record<BannerPlacement, string> = {
  below_hero: "Abaixo do hero",
  between_lineup_tickets: "Entre programação e ingressos",
  before_experiences: "Antes das experiências",
  before_footer: "Antes do footer",
};

export const NEWS_STATUSES: readonly NewsStatus[] = ["draft", "published"] as const;
export const NEWS_STATUS_LABEL: Record<NewsStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
};

export const COMMERCIAL_LINK_TYPES: readonly CommercialLinkType[] = [
  "ticket",
  "passport",
  "sector",
  "external_space",
  "other",
] as const;

export const COMMERCIAL_LINK_TYPE_LABEL: Record<CommercialLinkType, string> = {
  ticket: "Ingresso",
  passport: "Passaporte",
  sector: "Setor",
  external_space: "Espaço externo",
  other: "Outro",
};

export function slugifyNews(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
