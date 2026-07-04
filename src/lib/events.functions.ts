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

