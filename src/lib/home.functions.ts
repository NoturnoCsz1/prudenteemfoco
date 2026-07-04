import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

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

export type HomeFeaturedEvent = {
  title: string;
  slug: string;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  city: string | null;
  short_description: string | null;
  cover_image_url: string | null;
  kind: "festival" | "show" | "special_event" | "other";
  format: "recurring" | "one_off";
  is_featured: boolean;
  featured_order: number | null;
};

export type HomeNewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  published_at: string | null;
  is_featured: boolean;
  event_slug: string;
  event_title: string;
};

export type HomeExperience = {
  space_type_id: string;
  event_slug: string;
  event_title: string;
  event_starts_at: string | null;
  name: string;
  category: "camarote" | "bistro" | "mesa" | "other";
  image_url: string | null;
  base_price: number | null;
  currency: string | null;
  available_units: number;
};

export const listHomeFeaturedEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeFeaturedEvent[]> => {
    const s = serverPublicClient();
    const { data, error } = await s.rpc("list_home_featured_events");
    if (error) {
      console.error("[listHomeFeaturedEvents]", error);
      return [];
    }
    return (data ?? []) as HomeFeaturedEvent[];
  },
);

export const listHomeNews = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(30).optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<HomeNewsItem[]> => {
    const s = serverPublicClient();
    const { data: rows, error } = await s.rpc("list_home_news", {
      _limit: data.limit ?? 6,
    });
    if (error) {
      console.error("[listHomeNews]", error);
      return [];
    }
    return (rows ?? []) as HomeNewsItem[];
  });

export const listHomeExperiences = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(20).optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<HomeExperience[]> => {
    const s = serverPublicClient();
    const { data: rows, error } = await s.rpc("list_home_experiences", {
      _limit: data.limit ?? 4,
    });
    if (error) {
      console.error("[listHomeExperiences]", error);
      return [];
    }
    return (rows ?? []) as HomeExperience[];
  });
