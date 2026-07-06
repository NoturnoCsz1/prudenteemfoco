import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
  title: string;
  description?: string;
  meta?: { label: string; value: string }[];
  /** Optional slug used in the downloaded filename (e.g. event slug). */
  fileSlug?: string;
};

function slugify(input: string | undefined | null): string {
  if (!input) return "qr";
  return input
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "qr";
}

export function QrCodeModal({ open, onOpenChange, token, title, description, meta, fileSlug }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  const filename = useMemo(() => {
    const base = slugify(fileSlug ?? title);
    const suffix = token ? token.slice(0, 8) : Date.now().toString(36);
    return `qr-${base}-${suffix}.png`;
  }, [fileSlug, title, token]);

  useEffect(() => {
    let cancelled = false;
    blobRef.current = null;
    if (!open || !token) {
      setDataUrl(null);
      return;
    }
    setBusy(true);
    // Render into a canvas so we can grab a Blob directly (mobile-friendly)
    // and also expose a data URL for the <img> preview.
    const canvas = document.createElement("canvas");
    QRCode.toCanvas(canvas, token, { width: 512, margin: 2, errorCorrectionLevel: "M" })
      .then(() => {
        if (cancelled) return;
        setDataUrl(canvas.toDataURL("image/png"));
        return new Promise<void>((resolve) => {
          canvas.toBlob((b) => {
            if (!cancelled && b) blobRef.current = b;
            resolve();
          }, "image/png");
        });
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  const copy = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    toast.success("Token copiado");
  };

  const ensureBlob = async (): Promise<Blob | null> => {
    if (blobRef.current) return blobRef.current;
    if (!dataUrl) return null;
    try {
      const res = await fetch(dataUrl);
      const b = await res.blob();
      blobRef.current = b;
      return b;
    } catch {
      return null;
    }
  };

  const download = async () => {
    const blob = await ensureBlob();
    if (!blob) {
      toast.error("Não foi possível gerar o PNG");
      return;
    }
    const url = URL.createObjectURL(blob);
    let downloaded = false;
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.target = "_self";
      document.body.appendChild(a);
      a.click();
      a.remove();
      downloaded = true;
    } catch {
      downloaded = false;
    }
    if (!downloaded) {
      // Fallback: open image so the user can long-press → Save
      const w = window.open(url, "_blank", "noopener");
      if (!w) {
        toast.error("Não foi possível baixar. Use Compartilhar ou mantenha o dedo sobre a imagem para salvar.");
      }
    }
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const share = async () => {
    const blob = await ensureBlob();
    if (!blob) {
      toast.error("Não foi possível gerar o PNG");
      return;
    }
    const file = new File([blob], filename, { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (data: { files?: File[] }) => boolean;
      share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
    };
    if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
      try {
        await nav.share({ files: [file], title: "QR emitido" });
      } catch {
        // user cancelled
      }
    } else {
      await download();
    }
  };


  const canShare = typeof navigator !== "undefined"
    && !!(navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean }).canShare;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-md max-h-[calc(100dvh-24px)] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="flex w-full min-w-0 flex-col items-center gap-3">
          {busy || !dataUrl ? (
            <div className="flex aspect-square w-full max-w-[280px] items-center justify-center rounded-md border border-dashed border-border">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <img
              src={dataUrl}
              alt="QR Code"
              className="aspect-square w-full max-w-[280px] rounded-md border border-border bg-white p-2"
            />
          )}

          {meta && meta.length > 0 ? (
            <dl className="w-full min-w-0 space-y-1 text-xs">
              {meta.map((m) => (
                <div key={m.label} className="flex min-w-0 justify-between gap-2">
                  <dt className="shrink-0 text-muted-foreground">{m.label}</dt>
                  <dd className="min-w-0 truncate text-right font-medium">{m.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {token ? (
            <div className="w-full min-w-0">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Token (não será exibido novamente)
              </p>
              <div className="flex min-w-0 items-center gap-1">
                <code className="min-w-0 flex-1 truncate rounded bg-muted/60 px-2 py-1 font-mono text-[11px]">
                  {token}
                </code>
                <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={download} disabled={!dataUrl} className="min-h-[48px] w-full sm:w-auto">
            Baixar PNG
          </Button>
          {canShare ? (
            <Button variant="outline" onClick={share} disabled={!dataUrl} className="min-h-[48px] w-full sm:w-auto">
              Compartilhar
            </Button>
          ) : null}
          <Button onClick={() => onOpenChange(false)} className="min-h-[48px] w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
