import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type HotsiteRow = Database["public"]["Tables"]["event_hotsite_settings"]["Row"];
type SponsorRow = Database["public"]["Tables"]["event_sponsors"]["Row"];
type BannerRow = Database["public"]["Tables"]["event_banners"]["Row"];
type NewsRow = Database["public"]["Tables"]["event_news"]["Row"];
type LinkRow = Database["public"]["Tables"]["event_commercial_links"]["Row"];

const eventIdInput = z.object({ event_id: z.string().uuid() });

// -------- Hotsite settings --------
export const getHotsiteSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => eventIdInput.parse(d))
  .handler(async ({ context, data }): Promise<HotsiteRow | null> => {
    const { data: row, error } = await context.supabase
      .from("event_hotsite_settings")
      .select("*")
      .eq("event_id", data.event_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const upsertSchema = z.object({
  event_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  hero_title: z.string().trim().max(200).nullable().optional(),
  hero_subtitle: z.string().trim().max(400).nullable().optional(),
  cta_primary_label: z.string().trim().max(80).nullable().optional(),
  cta_primary_url: z.string().trim().max(2000).nullable().optional(),
  cta_secondary_label: z.string().trim().max(80).nullable().optional(),
  cta_secondary_url: z.string().trim().max(2000).nullable().optional(),
  show_countdown: z.boolean(),
  show_lineup: z.boolean(),
  show_tickets: z.boolean(),
  show_experiences: z.boolean(),
  show_sponsors: z.boolean(),
  show_news: z.boolean(),
  show_info: z.boolean(),
  show_banners: z.boolean(),
  info_address: z.string().trim().max(400).nullable().optional(),
  info_gates_open_at: z.string().trim().max(80).nullable().optional(),
  info_age_rating: z.string().trim().max(80).nullable().optional(),
  info_parking: z.string().trim().max(400).nullable().optional(),
  info_map_url: z.string().trim().max(2000).nullable().optional(),
  info_rules: z.string().trim().max(4000).nullable().optional(),
});

export const upsertHotsiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("event_hotsite_settings")
      .upsert(
        {
          event_id: data.event_id,
          organization_id: data.organization_id,
          hero_title: data.hero_title ?? null,
          hero_subtitle: data.hero_subtitle ?? null,
          cta_primary_label: data.cta_primary_label ?? null,
          cta_primary_url: data.cta_primary_url ?? null,
          cta_secondary_label: data.cta_secondary_label ?? null,
          cta_secondary_url: data.cta_secondary_url ?? null,
          show_countdown: data.show_countdown,
          show_lineup: data.show_lineup,
          show_tickets: data.show_tickets,
          show_experiences: data.show_experiences,
          show_sponsors: data.show_sponsors,
          show_news: data.show_news,
          show_info: data.show_info,
          show_banners: data.show_banners,
          info_address: data.info_address ?? null,
          info_gates_open_at: data.info_gates_open_at ?? null,
          info_age_rating: data.info_age_rating ?? null,
          info_parking: data.info_parking ?? null,
          info_map_url: data.info_map_url ?? null,
          info_rules: data.info_rules ?? null,
        },
        { onConflict: "event_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// -------- Sponsors --------
export const listSponsors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => eventIdInput.parse(d))
  .handler(async ({ context, data }): Promise<SponsorRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("event_sponsors")
      .select("*")
      .eq("event_id", data.event_id)
      .order("category")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const sponsorInput = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  category: z.enum([
    "master",
    "sponsor",
    "supporter",
    "partner",
    "realization",
    "production",
    "media",
  ]),
  logo_url: z.string().trim().max(2000).nullable().optional(),
  website_url: z.string().trim().max(2000).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

export const upsertSponsor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sponsorInput.parse(d))
  .handler(async ({ context, data }) => {
    const payload = {
      event_id: data.event_id,
      organization_id: data.organization_id,
      name: data.name,
      category: data.category,
      logo_url: data.logo_url ?? null,
      website_url: data.website_url ?? null,
      sort_order: data.sort_order,
      is_active: data.is_active,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("event_sponsors")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("event_sponsors")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSponsor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("event_sponsors")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Banners --------
export const listBanners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => eventIdInput.parse(d))
  .handler(async ({ context, data }): Promise<BannerRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("event_banners")
      .select("*")
      .eq("event_id", data.event_id)
      .order("placement")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const bannerInput = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  title: z.string().trim().max(160).nullable().optional(),
  image_url: z.string().trim().min(1).max(2000),
  link_url: z.string().trim().max(2000).nullable().optional(),
  placement: z.enum([
    "below_hero",
    "between_lineup_tickets",
    "before_experiences",
    "before_footer",
  ]),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

export const upsertBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bannerInput.parse(d))
  .handler(async ({ context, data }) => {
    const payload = {
      event_id: data.event_id,
      organization_id: data.organization_id,
      title: data.title ?? null,
      image_url: data.image_url,
      link_url: data.link_url ?? null,
      placement: data.placement,
      sort_order: data.sort_order,
      is_active: data.is_active,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("event_banners")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("event_banners")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("event_banners")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- News --------
export const listNews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => eventIdInput.parse(d))
  .handler(async ({ context, data }): Promise<NewsRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("event_news")
      .select("*")
      .eq("event_id", data.event_id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const newsInput = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().trim().max(600).nullable().optional(),
  content: z.string().trim().max(20000).nullable().optional(),
  image_url: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(["draft", "published"]),
  published_at: z.string().nullable().optional(),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const upsertNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => newsInput.parse(d))
  .handler(async ({ context, data }) => {
    const payload = {
      event_id: data.event_id,
      organization_id: data.organization_id,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt ?? null,
      content: data.content ?? null,
      image_url: data.image_url ?? null,
      status: data.status,
      published_at:
        data.published_at ??
        (data.status === "published" ? new Date().toISOString() : null),
      is_featured: data.is_featured,
      sort_order: data.sort_order,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("event_news")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("event_news")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("event_news")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Commercial links --------
export const listCommercialLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => eventIdInput.parse(d))
  .handler(async ({ context, data }): Promise<LinkRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("event_commercial_links")
      .select("*")
      .eq("event_id", data.event_id)
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const linkInput = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  label: z.string().trim().min(1).max(120),
  event_date: z.string().nullable().optional(),
  link_type: z.enum(["ticket", "passport", "sector", "external_space", "other"]),
  destination_url: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .regex(/^https:\/\/[^\s"<>]+$/, "Use uma URL https:// válida."),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
  tracking_enabled: z.boolean().default(true),
});

export const upsertCommercialLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => linkInput.parse(d))
  .handler(async ({ context, data }) => {
    const payload = {
      event_id: data.event_id,
      organization_id: data.organization_id,
      label: data.label,
      event_date: data.event_date ?? null,
      link_type: data.link_type,
      destination_url: data.destination_url,
      sort_order: data.sort_order,
      is_active: data.is_active,
      tracking_enabled: data.tracking_enabled,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("event_commercial_links")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("event_commercial_links")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCommercialLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("event_commercial_links")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
