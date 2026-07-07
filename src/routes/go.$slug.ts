import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function parseUA(ua: string): { device: string; browser: string } {
  const lower = ua.toLowerCase();
  let device = "desktop";
  if (/ipad|tablet/.test(lower)) device = "tablet";
  else if (/mobile|android|iphone/.test(lower)) device = "mobile";
  let browser = "outro";
  if (/edg\//.test(lower)) browser = "Edge";
  else if (/chrome\//.test(lower) && !/edg\//.test(lower)) browser = "Chrome";
  else if (/firefox\//.test(lower)) browser = "Firefox";
  else if (/safari\//.test(lower) && !/chrome\//.test(lower)) browser = "Safari";
  else if (/opr\//.test(lower)) browser = "Opera";
  return { device, browser };
}

function isSafeDestination(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/go/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const slug = params.slug.toLowerCase();
        if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug)) {
          return new Response("Link inválido", { status: 404 });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Serviço indisponível", { status: 503 });
        }

        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const url = new URL(request.url);
        const ua = request.headers.get("user-agent") ?? "";
        const { device, browser } = parseUA(ua);
        const referrer = request.headers.get("referer");

        const { data: destination, error } = await supabase.rpc("resolve_and_track_short_link", {
          _slug: slug,
          _referrer: referrer ?? undefined,
          _user_agent: ua || undefined,
          _device: device,
          _browser: browser,
          _utm_source: url.searchParams.get("utm_source") ?? undefined,
          _utm_medium: url.searchParams.get("utm_medium") ?? undefined,
          _utm_campaign: url.searchParams.get("utm_campaign") ?? undefined,
          _utm_content: url.searchParams.get("utm_content") ?? undefined,
          _utm_term: url.searchParams.get("utm_term") ?? undefined,
        });

        if (error || !destination || !isSafeDestination(destination)) {
          return new Response("Link indisponível", { status: 404 });
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: destination,
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        });
      },
    },
  },
});
