import { useRef, useState } from "react";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 5 * 1024 * 1024;
// Signed URL TTL: 100 anos (bucket é privado — workspace bloqueia bucket público).
// Ver docs/PHASE_2_1_PUBLIC_PROJECTION_STORAGE.md.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 100;
const BUCKET = "event-covers";

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}

function pathFromSignedUrl(url: string): string | null {
  // Formato: https://<host>/storage/v1/object/sign/event-covers/<path>?token=...
  const m = url.match(/\/object\/sign\/event-covers\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function CoverUpload({
  organizationId,
  eventId,
  value,
  onChange,
  onAudit,
}: {
  organizationId: string;
  eventId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  onAudit?: (
    action: "event.cover_uploaded" | "event.cover_replaced" | "event.cover_removed",
    metadata: { storage_path: string | null },
  ) => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!ACCEPTED_MIME.includes(file.type as (typeof ACCEPTED_MIME)[number])) {
      toast.error("Formato inválido. Use JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo maior que 5 MB.");
      return;
    }
    setBusy(true);
    const previousPath = value ? pathFromSignedUrl(value) : null;
    try {
      const uuid = crypto.randomUUID();
      const path = `${organizationId}/${eventId}/${uuid}.${extFromMime(file.type)}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (signErr || !signed) throw signErr ?? new Error("Falha ao gerar URL.");

      onChange(signed.signedUrl);
      await onAudit?.(
        previousPath ? "event.cover_replaced" : "event.cover_uploaded",
        { storage_path: path },
      );

      // Best-effort: remove capa anterior desta mesma organização/evento.
      if (previousPath && previousPath.startsWith(`${organizationId}/${eventId}/`)) {
        await supabase.storage.from(BUCKET).remove([previousPath]);
      }
      toast.success("Capa enviada.");
    } catch (err) {
      toast.error((err as Error).message || "Falha ao enviar capa.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!value) return;
    const previousPath = pathFromSignedUrl(value);
    setBusy(true);
    try {
      if (
        previousPath &&
        previousPath.startsWith(`${organizationId}/${eventId}/`)
      ) {
        await supabase.storage.from(BUCKET).remove([previousPath]);
      }
      onChange(null);
      await onAudit?.("event.cover_removed", { storage_path: previousPath });
      toast.success("Capa removida.");
    } catch (err) {
      toast.error((err as Error).message || "Falha ao remover capa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Capa do evento
      </span>
      <div className="mt-2 flex flex-col gap-3">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-border bg-muted">
          {value ? (
            <img
              src={value}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-border-strong px-3 py-2 text-xs font-medium hover:bg-accent disabled:opacity-60"
          >
            <Upload className="h-3.5 w-3.5" />
            {value ? "Substituir" : "Enviar capa"}
          </button>
          {value && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRemove()}
              className="inline-flex items-center gap-2 rounded-md border border-border-strong px-3 py-2 text-xs font-medium hover:bg-accent disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" />
              Remover
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG ou WebP. Máx. 5 MB. A capa fica visível publicamente
          quando o evento é publicado.
        </p>
      </div>
    </div>
  );
}
