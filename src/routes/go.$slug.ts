import { createFileRoute } from "@tanstack/react-router";

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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: link } = await supabaseAdmin
          .from("short_links")
          .select("id, destination_url, active")
          .eq("slug", slug)
          .maybeSingle();

        if (!link || !link.active || !isSafeDestination(link.destination_url)) {
          return new Response("Link indisponível", { status: 404 });
        }

        const url = new URL(request.url);
        const ua = request.headers.get("user-agent") ?? "";
        const { device, browser } = parseUA(ua);
        const referrer = request.headers.get("referer");

        // Fire-and-forget insert (do not block redirect on tracking failure)
        void supabaseAdmin.from("short_link_clicks").insert({
          short_link_id: link.id,
          referrer: referrer ? referrer.slice(0, 512) : null,
          user_agent: ua ? ua.slice(0, 512) : null,
          device,
          browser,
          utm_source: url.searchParams.get("utm_source"),
          utm_medium: url.searchParams.get("utm_medium"),
          utm_campaign: url.searchParams.get("utm_campaign"),
          utm_content: url.searchParams.get("utm_content"),
          utm_term: url.searchParams.get("utm_term"),
        });

        return new Response(null, {
          status: 302,
          headers: {
            Location: link.destination_url,
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        });
      },
    },
  },
});
