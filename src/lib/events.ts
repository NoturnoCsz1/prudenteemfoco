import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type EventStatus = Database["public"]["Enums"]["event_status"];

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
      .max(600, "URL muito longa.")
      .optional()
      .transform((v) => (v && v.length ? v : null))
      .refine(
        (v) =>
          v === null ||
          /^https:\/\/[^\s"<>]+$/.test(v),
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
  });
  if (!ends_at) return startStr;
  const end = new Date(ends_at);
  const sameDay =
    start.toDateString() === end.toDateString();
  const endStr = end.toLocaleString(
    "pt-BR",
    sameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
  );
  return `${startStr} — ${endStr}`;
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
