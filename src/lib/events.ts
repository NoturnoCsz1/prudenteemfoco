import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type EventStatus = Database["public"]["Enums"]["event_status"];
export type EventKind = Database["public"]["Enums"]["event_kind"];
export type EventFormat = Database["public"]["Enums"]["event_format"];

export const EVENT_STATUSES: readonly EventStatus[] = [
  "draft",
  "scheduled",
  "published",
  "cancelled",
  "archived",
] as const;

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendado",
  published: "Publicado",
  cancelled: "Cancelado",
  archived: "Arquivado",
};

export const EVENT_STATUS_TONE: Record<EventStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-primary/15 text-primary",
  published: "bg-accent/20 text-accent",
  cancelled: "bg-destructive/15 text-destructive",
  archived: "bg-muted/60 text-muted-foreground",
};

export const EVENT_KINDS: readonly EventKind[] = [
  "festival",
  "show",
  "special_event",
  "other",
] as const;

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  festival: "Festival",
  show: "Show",
  special_event: "Evento especial",
  other: "Outro",
};

export const EVENT_FORMATS: readonly EventFormat[] = ["recurring", "one_off"] as const;

export const EVENT_FORMAT_LABEL: Record<EventFormat, string> = {
  recurring: "Recorrente",
  one_off: "Evento único",
};

/**
 * Normaliza o valor de `cover_image_url` recebido do banco.
 * `null`, `undefined`, string vazia ou apenas espaços viram `null`.
 * Evita renderizar `<img src="">`.
 */
export function normalizeCoverUrl(v: string | null | undefined): string | null {
  if (v == null) return null;
  const trimmed = String(v).trim();
  return trimmed.length > 0 ? trimmed : null;
}

const nullableIso = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length ? v : null))
  .refine(
    (v) => v === null || !Number.isNaN(Date.parse(v)),
    "Data inválida.",
  );

export const eventFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Título muito curto.")
      .max(200, "Máximo 200 caracteres."),
    slug: z
      .string()
      .trim()
      .min(3, "Slug muito curto.")
      .max(120, "Máximo 120 caracteres.")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use apenas letras minúsculas, números e hífens.",
      ),
    status: z.enum(EVENT_STATUSES as unknown as [EventStatus, ...EventStatus[]]),
    kind: z
      .enum(EVENT_KINDS as unknown as [EventKind, ...EventKind[]])
      .default("other"),
    format: z
      .enum(EVENT_FORMATS as unknown as [EventFormat, ...EventFormat[]])
      .default("one_off"),
    starts_at: nullableIso,
    ends_at: nullableIso,
    venue_name: z
      .string()
      .trim()
      .max(160, "Máximo 160 caracteres.")
      .optional()
      .transform((v) => (v && v.length ? v : null)),
    city: z
      .string()
      .trim()
      .max(120, "Máximo 120 caracteres.")
      .optional()
      .transform((v) => (v && v.length ? v : null)),
    short_description: z
      .string()
      .trim()
      .max(600, "Máximo 600 caracteres.")
      .optional()
      .transform((v) => (v && v.length ? v : null)),
    cover_image_url: z
      .string()
      .trim()
      .max(2000, "URL muito longa.")
      .optional()
      .transform((v) => (v && v.length ? v : null))
      .refine(
        (v) => v === null || /^https:\/\/[^\s"<>]+$/.test(v),
        "Use uma URL https:// válida.",
      ),
    long_description: z
      .string()
      .trim()
      .max(8000, "Máximo 8000 caracteres.")
      .optional()
      .transform((v) => (v && v.length ? v : null)),
    instagram_url: z
      .string()
      .trim()
      .max(2000, "URL muito longa.")
      .optional()
      .transform((v) => (v && v.length ? v : null))
      .refine(
        (v) => v === null || /^https:\/\/[^\s"<>]+$/.test(v),
        "Use uma URL https:// válida.",
      ),
    external_ticket_url: z
      .string()
      .trim()
      .max(2000, "URL muito longa.")
      .optional()
      .transform((v) => (v && v.length ? v : null))
      .refine(
        (v) => v === null || /^https:\/\/[^\s"<>]+$/.test(v),
        "Use uma URL https:// válida.",
      ),

  })
  .refine(
    (v) =>
      !v.starts_at || !v.ends_at || Date.parse(v.ends_at) >= Date.parse(v.starts_at),
    { message: "Fim deve ser após o início.", path: ["ends_at"] },
  );

export type EventFormValues = z.infer<typeof eventFormSchema>;

/** Gera um slug URL-safe a partir de um título. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

// Timezone fixo do evento (Presidente Prudente / São Paulo). Necessário para
// garantir que SSR e client produzam a MESMA string — caso contrário a rota
// pública sofre mismatch de hidratação, porque o servidor renderiza em UTC.
const EVENT_TZ = "America/Sao_Paulo";

export function formatEventDateRange(
  starts_at: string | null,
  ends_at: string | null,
): string {
  if (!starts_at) return "Data a definir";
  const start = new Date(starts_at);
  const startStr = start.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: EVENT_TZ,
  });
  if (!ends_at) return startStr;
  const end = new Date(ends_at);
  const dayKey = (d: Date) =>
    d.toLocaleDateString("pt-BR", { timeZone: EVENT_TZ });
  const sameDay = dayKey(start) === dayKey(end);
  const endStr = end.toLocaleString(
    "pt-BR",
    sameDay
      ? { hour: "2-digit", minute: "2-digit", timeZone: EVENT_TZ }
      : {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: EVENT_TZ,
        },
  );
  return `${startStr} — ${endStr}`;
}

/** Formato editorial curto (ex.: "10–14 SET · 2026") para heroes e cards de festival. */
export function formatEventDateEditorial(
  starts_at: string | null,
  ends_at: string | null,
): string {
  if (!starts_at) return "Data a definir";
  const start = new Date(starts_at);
  const startDay = start.toLocaleDateString("pt-BR", {
    day: "2-digit",
    timeZone: EVENT_TZ,
  });
  const startMonth = start
    .toLocaleDateString("pt-BR", { month: "short", timeZone: EVENT_TZ })
    .replace(".", "")
    .toUpperCase();
  const year = start.toLocaleDateString("pt-BR", {
    year: "numeric",
    timeZone: EVENT_TZ,
  });
  if (!ends_at) return `${startDay} ${startMonth} · ${year}`;
  const end = new Date(ends_at);
  const endDay = end.toLocaleDateString("pt-BR", {
    day: "2-digit",
    timeZone: EVENT_TZ,
  });
  const endMonth = end
    .toLocaleDateString("pt-BR", { month: "short", timeZone: EVENT_TZ })
    .replace(".", "")
    .toUpperCase();
  const dayKey = (d: Date) =>
    d.toLocaleDateString("pt-BR", { timeZone: EVENT_TZ });
  if (dayKey(start) === dayKey(end)) return `${startDay} ${startMonth} · ${year}`;
  if (startMonth === endMonth) return `${startDay}–${endDay} ${startMonth} · ${year}`;
  return `${startDay} ${startMonth} – ${endDay} ${endMonth} · ${year}`;
}

/** Converte um ISO datetime string para o formato "YYYY-MM-DDTHH:mm" de <input type="datetime-local">. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
