import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SitePage = Database["public"]["Enums"]["site_page"];

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

export type SiteHome = Database["public"]["Functions"]["get_site_home"]["Returns"][number];
export type SiteAbout = Database["public"]["Functions"]["get_site_about"]["Returns"][number];
export type SiteContact = Database["public"]["Functions"]["get_site_contact"]["Returns"][number];
export type SiteMenu = Database["public"]["Functions"]["get_site_menu"]["Returns"][number];
export type SiteMemoryItem =
  Database["public"]["Functions"]["list_site_memory_items"]["Returns"][number];
export type SiteSeo = Database["public"]["Functions"]["get_site_seo"]["Returns"][number];

export const getSiteHome = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteHome | null> => {
    const sb = serverPublicClient();
    const { data, error } = await sb.rpc("get_site_home");
    if (error) {
      console.error("[getSiteHome]", error);
      return null;
    }
    return data?.[0] ?? null;
  },
);

export const getSiteAbout = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteAbout | null> => {
    const sb = serverPublicClient();
    const { data, error } = await sb.rpc("get_site_about");
    if (error) {
      console.error("[getSiteAbout]", error);
      return null;
    }
    return data?.[0] ?? null;
  },
);

export const getSiteContact = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteContact | null> => {
    const sb = serverPublicClient();
    const { data, error } = await sb.rpc("get_site_contact");
    if (error) {
      console.error("[getSiteContact]", error);
      return null;
    }
    return data?.[0] ?? null;
  },
);

export const getSiteMenu = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteMenu | null> => {
    const sb = serverPublicClient();
    const { data, error } = await sb.rpc("get_site_menu");
    if (error) {
      console.error("[getSiteMenu]", error);
      return null;
    }
    return data?.[0] ?? null;
  },
);

export const listSiteMemoryItems = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteMemoryItem[]> => {
    const sb = serverPublicClient();
    const { data, error } = await sb.rpc("list_site_memory_items");
    if (error) {
      console.error("[listSiteMemoryItems]", error);
      return [];
    }
    return data ?? [];
  },
);

export const getSiteSeo = createServerFn({ method: "GET" })
  .inputValidator((input: { page: SitePage }) => input)
  .handler(async ({ data }): Promise<SiteSeo | null> => {
    const sb = serverPublicClient();
    const { data: rows, error } = await sb.rpc("get_site_seo", {
      _page_key: data.page,
    });
    if (error) {
      console.error("[getSiteSeo]", error);
      return null;
    }
    return rows?.[0] ?? null;
  });
