import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

/**
 * Cliente Supabase server-only com chave publishable (anon).
 * Usado exclusivamente para chamadas de RPC públicas — nenhum SELECT
 * direto na tabela administrativa `public.events`.
 */
function serverPublicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export type PublicEvent = {
  title: string;
  slug: string;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  city: string | null;
  short_description: string | null;
  cover_image_url: string | null;
  long_description: string | null;
  instagram_url: string | null;
  external_ticket_url: string | null;
  kind: "festival" | "show" | "special_event" | "other";
  format: "recurring" | "one_off";
};

export type PublicAttraction = {
  id: string;
  name: string;
  performs_on: string | null;
  sort_order: number;
  image_url: string | null;
  notes: string | null;
};

/** Lista eventos publicados via RPC pública (`public.list_published_events`). */
export const listPublishedEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicEvent[]> => {
    const supabase = serverPublicClient();
    const { data, error } = await supabase.rpc("list_published_events");
    if (error) {
      console.error("[listPublishedEvents]", error);
      return [];
    }
    return (data ?? []) as PublicEvent[];
  },
);

/** Busca evento publicado por slug via RPC pública. */
export const getPublishedEventBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }): Promise<PublicEvent | null> => {
    const supabase = serverPublicClient();
    const { data: rows, error } = await supabase.rpc(
      "get_published_event_by_slug",
      { _slug: data.slug },
    );
    if (error) {
      console.error("[getPublishedEventBySlug]", error);
      return null;
    }
    const row = (rows ?? [])[0];
    return (row as PublicEvent | undefined) ?? null;
  });

/** Lista atrações do line-up de um evento publicado. */
export const listEventAttractionsBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }): Promise<PublicAttraction[]> => {
    const supabase = serverPublicClient();
    const { data: rows, error } = await supabase.rpc(
      "list_event_attractions_by_slug",
      { _slug: data.slug },
    );
    if (error) {
      console.error("[listEventAttractionsBySlug]", error);
      return [];
    }
    return (rows ?? []) as PublicAttraction[];
  });

// ============ HOTSITE PUBLIC FETCHERS ============

export type PublicHotsiteSettings = {
  event_id: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  cta_primary_label: string | null;
  cta_primary_url: string | null;
  cta_secondary_label: string | null;
  cta_secondary_url: string | null;
  show_countdown: boolean;
  show_lineup: boolean;
  show_tickets: boolean;
  show_experiences: boolean;
  show_sponsors: boolean;
  show_news: boolean;
  show_info: boolean;
  show_banners: boolean;
  info_address: string | null;
  info_gates_open_at: string | null;
  info_age_rating: string | null;
  info_parking: string | null;
  info_map_url: string | null;
  info_rules: string | null;
  info_faq: unknown;
};

export type PublicSponsor = {
  id: string;
  name: string;
  category:
    | "master"
    | "sponsor"
    | "supporter"
    | "partner"
    | "realization"
    | "production"
    | "media";
  logo_url: string | null;
  website_url: string | null;
  sort_order: number;
};

export type PublicBanner = {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  placement:
    | "below_hero"
    | "between_lineup_tickets"
    | "before_experiences"
    | "before_footer";
  sort_order: number;
};

export type PublicNewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  published_at: string | null;
  is_featured: boolean;
};

export type PublicNewsFull = PublicNewsItem & { content: string | null };

export type PublicCommercialLink = {
  id: string;
  label: string;
  event_date: string | null;
  link_type: "ticket" | "passport" | "sector" | "external_space" | "other";
  destination_url: string;
  sort_order: number;
  tracking_enabled: boolean;
};

const slugSchema = z.object({ slug: z.string().min(1).max(200) });

export const getHotsiteBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => slugSchema.parse(d))
  .handler(async ({ data }): Promise<PublicHotsiteSettings | null> => {
    const s = serverPublicClient();
    const { data: rows, error } = await s.rpc("get_event_hotsite_by_slug", {
      _slug: data.slug,
    });
    if (error) {
      console.error("[getHotsiteBySlug]", error);
      return null;
    }
    return ((rows ?? [])[0] as PublicHotsiteSettings | undefined) ?? null;
  });

export const listSponsorsBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => slugSchema.parse(d))
  .handler(async ({ data }): Promise<PublicSponsor[]> => {
    const s = serverPublicClient();
    const { data: rows, error } = await s.rpc("list_event_sponsors_by_slug", {
      _slug: data.slug,
    });
    if (error) {
      console.error("[listSponsorsBySlug]", error);
      return [];
    }
    return (rows ?? []) as PublicSponsor[];
  });

export const listBannersBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => slugSchema.parse(d))
  .handler(async ({ data }): Promise<PublicBanner[]> => {
    const s = serverPublicClient();
    const { data: rows, error } = await s.rpc("list_event_banners_by_slug", {
      _slug: data.slug,
    });
    if (error) {
      console.error("[listBannersBySlug]", error);
      return [];
    }
    return (rows ?? []) as PublicBanner[];
  });

export const listNewsBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({ slug: z.string().min(1).max(200), limit: z.number().int().min(1).max(50).optional() })
      .parse(d),
  )
  .handler(async ({ data }): Promise<PublicNewsItem[]> => {
    const s = serverPublicClient();
    const { data: rows, error } = await s.rpc("list_event_news_by_slug", {
      _slug: data.slug,
      _limit: data.limit ?? 6,
    });
    if (error) {
      console.error("[listNewsBySlug]", error);
      return [];
    }
    return (rows ?? []) as PublicNewsItem[];
  });

export const getNewsBySlugs = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        event_slug: z.string().min(1).max(200),
        news_slug: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<PublicNewsFull | null> => {
    const s = serverPublicClient();
    const { data: rows, error } = await s.rpc("get_event_news_by_slugs", {
      _event_slug: data.event_slug,
      _news_slug: data.news_slug,
    });
    if (error) {
      console.error("[getNewsBySlugs]", error);
      return null;
    }
    return ((rows ?? [])[0] as PublicNewsFull | undefined) ?? null;
  });

export const listCommercialLinksBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => slugSchema.parse(d))
  .handler(async ({ data }): Promise<PublicCommercialLink[]> => {
    const s = serverPublicClient();
    const { data: rows, error } = await s.rpc(
      "list_event_commercial_links_by_slug",
      { _slug: data.slug },
    );
    if (error) {
      console.error("[listCommercialLinksBySlug]", error);
      return [];
    }
    return (rows ?? []) as PublicCommercialLink[];
  });


