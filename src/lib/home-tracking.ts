/**
 * Tracking client-side da Home. Todos os kinds passam por track_hotsite_event
 * (SECURITY DEFINER), que resolve event_id/organization_id/promoter_id no
 * servidor a partir do slug + código de promoter. O front NUNCA envia
 * organization_id / event_id / promoter_id arbitrários.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Attribution } from "./attribution";

type Kind = Database["public"]["Enums"]["hotsite_click_kind"];

export function trackHomeEvent(
  eventSlug: string,
  kind: Kind,
  attribution: Attribution,
  commercialLinkId?: string | null,
) {
  if (typeof window === "undefined") return;
  supabase
    .rpc("track_hotsite_event", {
      _event_slug: eventSlug,
      _kind: kind,
      _commercial_link_id: commercialLinkId ?? undefined,
      _promoter_code: attribution.promoter ?? undefined,
      _utm_source: attribution.utm_source ?? undefined,
      _utm_medium: attribution.utm_medium ?? undefined,
      _utm_campaign: attribution.utm_campaign ?? undefined,
      _utm_content: attribution.utm_content ?? undefined,
      _utm_term: attribution.utm_term ?? undefined,
      _referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    })
    .then(({ error }) => {
      if (error) console.warn("[trackHomeEvent]", error.message);
    });
}
