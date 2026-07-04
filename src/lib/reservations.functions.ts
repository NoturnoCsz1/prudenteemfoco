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

export type PublicSpaceType = {
  space_type_id: string;
  name: string;
  category: Database["public"]["Enums"]["space_type_category"];
  description: string | null;
  capacity_per_unit: number | null;
  base_price: number | null;
  currency: string;
  image_url: string | null;
  total_units: number;
  available_units: number;
};

export const listAvailableSpaceTypes = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }): Promise<PublicSpaceType[]> => {
    const supabase = serverPublicClient();
    const { data: rows, error } = await supabase.rpc(
      "list_available_space_types_by_slug",
      { _slug: data.slug },
    );
    if (error) {
      console.error("[listAvailableSpaceTypes]", error);
      return [];
    }
    return (rows ?? []).map((r) => ({
      ...r,
      base_price: r.base_price != null ? Number(r.base_price) : null,
    })) as PublicSpaceType[];
  });

const createRequestSchema = z.object({
  event_slug: z.string().trim().min(1).max(200),
  space_type_id: z.string().uuid(),
  requester_name: z.string().trim().min(1).max(120),
  requester_contact: z.string().trim().min(3).max(200),
  promoter_code: z.string().trim().min(1).max(64).optional().nullable(),
  party_size: z.number().int().min(1).max(500).optional().nullable(),
  message: z.string().trim().max(1000).optional().nullable(),
});

export const createSpaceReservationRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createRequestSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string } | { error: string }> => {
    const supabase = serverPublicClient();
    const { data: id, error } = await supabase.rpc(
      "create_public_space_reservation_request",
      {
        _event_slug: data.event_slug,
        _space_type_id: data.space_type_id,
        _requester_name: data.requester_name,
        _requester_contact: data.requester_contact,
        _promoter_code: data.promoter_code ?? null,
        _party_size: data.party_size ?? null,
        _message: data.message ?? null,
        _metadata: {},
      },
    );
    if (error) {
      console.error("[createSpaceReservationRequest]", error);
      return { error: "Não foi possível registrar sua solicitação agora." };
    }
    return { id: id as unknown as string };
  });
