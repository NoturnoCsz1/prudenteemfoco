import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugRe = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const httpRe = /^https?:\/\//i;

const createSchema = z.object({
  organization_id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().toLowerCase().regex(slugRe, "Slug inválido"),
  destination_url: z.string().url().max(2048).regex(httpRe, "URL deve começar com http(s)://"),
  campaign: z.string().trim().max(120).optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
  active: z.boolean().optional(),
});

const updateSchema = createSchema.partial().extend({ id: z.string().uuid() });

export const listShortLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organization_id: string }) =>
    z.object({ organization_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("short_links")
      .select("id, slug, title, destination_url, campaign, event_id, active, created_at, updated_at")
      .eq("organization_id", data.organization_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createShortLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("short_links")
      .insert({
        organization_id: data.organization_id,
        title: data.title,
        slug: data.slug,
        destination_url: data.destination_url,
        campaign: data.campaign ?? null,
        event_id: data.event_id ?? null,
        active: data.active ?? true,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateShortLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("short_links")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteShortLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("short_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getShortLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("short_links")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const getShortLinkMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: clicks, error } = await context.supabase
      .from("short_link_clicks")
      .select("clicked_at, referrer, device, browser, utm_source, utm_medium, utm_campaign, utm_content, utm_term")
      .eq("short_link_id", data.id)
      .order("clicked_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const now = Date.now();
    const dayMs = 86400000;
    let today = 0;
    let d7 = 0;
    let d30 = 0;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTodayMs = startOfToday.getTime();
    const referrers = new Map<string, number>();
    const devices = new Map<string, number>();
    const browsers = new Map<string, number>();
    const utmSources = new Map<string, number>();

    for (const c of clicks ?? []) {
      const t = new Date(c.clicked_at).getTime();
      if (t >= startTodayMs) today++;
      if (now - t <= 7 * dayMs) d7++;
      if (now - t <= 30 * dayMs) d30++;
      const ref = (c.referrer || "direto").replace(/^https?:\/\//, "").split("/")[0] || "direto";
      referrers.set(ref, (referrers.get(ref) ?? 0) + 1);
      if (c.device) devices.set(c.device, (devices.get(c.device) ?? 0) + 1);
      if (c.browser) browsers.set(c.browser, (browsers.get(c.browser) ?? 0) + 1);
      if (c.utm_source) utmSources.set(c.utm_source, (utmSources.get(c.utm_source) ?? 0) + 1);
    }

    // total count (may exceed 500 recent sample)
    const { count } = await context.supabase
      .from("short_link_clicks")
      .select("id", { count: "exact", head: true })
      .eq("short_link_id", data.id);

    const toArr = (m: Map<string, number>) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, count]) => ({ label, count }));

    return {
      total: count ?? clicks?.length ?? 0,
      today,
      d7,
      d30,
      referrers: toArr(referrers),
      devices: toArr(devices),
      browsers: toArr(browsers),
      utm_sources: toArr(utmSources),
      recent: (clicks ?? []).slice(0, 50),
    };
  });
