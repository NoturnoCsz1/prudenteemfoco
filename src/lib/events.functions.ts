import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

/**
 * Cliente Supabase server-only com chave publishable (anon).
 * Usado exclusivamente para leituras públicas — RLS aplica como anon,
 * portanto só retorna linhas permitidas por policies TO anon.
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

const PUBLIC_COLUMNS =
  "id, title, slug, status, starts_at, ends_at, venue_name, city, short_description, cover_image_url" as const;

export type PublicEvent = {
  id: string;
  title: string;
  slug: string;
  status: "published";
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  city: string | null;
  short_description: string | null;
  cover_image_url: string | null;
};

/** Lista eventos publicados. Chamada por loaders/páginas públicas. */
export const listPublishedEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicEvent[]> => {
    const supabase = serverPublicClient();
    const { data, error } = await supabase
      .from("events")
      .select(PUBLIC_COLUMNS)
      .eq("status", "published")
      .order("starts_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("[listPublishedEvents]", error);
      return [];
    }
    return (data ?? []) as PublicEvent[];
  },
);

/** Busca um evento publicado por slug. Retorna null se não existir/não publicado. */
export const getPublishedEventBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }): Promise<PublicEvent | null> => {
    const supabase = serverPublicClient();
    const { data: row, error } = await supabase
      .from("events")
      .select(PUBLIC_COLUMNS)
      .eq("status", "published")
      .eq("slug", data.slug)
      .maybeSingle();

    if (error) {
      console.error("[getPublishedEventBySlug]", error);
      return null;
    }
    return (row as PublicEvent | null) ?? null;
  });
