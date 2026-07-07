import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink, Loader2, Share2 } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
  title: string;
  description?: string;
  meta?: { label: string; value: string }[];
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMobile = useIsMobile();

  const filename = useMemo(() => {
    const base = slugify(fileSlug ?? title);
    const suffix = token ? token.slice(0, 8) : Date.now().toString(36);
    return `qr-${base}-${suffix}.png`;
  }, [fileSlug, title, token]);

  useEffect(() => {
    let cancelled = false;
    if (!open || !token) {
      setDataUrl(null);
      canvasRef.current = null;
      return;
    }
    setBusy(true);
    const canvas = document.createElement("canvas");
    QRCode.toCanvas(canvas, token, { width: 512, margin: 2, errorCorrectionLevel: "M" })
      .then(() => {
        if (cancelled) return;
        canvasRef.current = canvas;
        setDataUrl(canvas.toDataURL("image/png"));
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
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Token copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  const makeBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      try {
        canvas.toBlob((b) => resolve(b), "image/png");
      } catch {
        resolve(null);
      }
    });

  const openInNewTab = () => {
    if (!dataUrl) {
      toast.error("QR ainda não gerado");
      return;
    }
    const w = window.open();
    if (w) {
      w.document.write(
        `<title>${filename}</title><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${dataUrl}" style="max-width:100%;height:auto" alt="QR"/></body>`,
      );
      w.document.close();
      toast.message("Mantenha pressionado sobre a imagem para salvar");
    } else {
      // Popup blocked — replace current page
      window.location.href = dataUrl;
    }
  };

  const download = async () => {
    const blob = await makeBlob();
    if (!blob) {
      openInNewTab();
      return;
    }
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.message("Se o arquivo não aparecer, use Compartilhar/Salvar ou Abrir imagem.");
    } catch {
      openInNewTab();
    }
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const share = async () => {
    const blob = await makeBlob();
    if (!blob) {
      openInNewTab();
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
        return;
      } catch {
        // user cancelled or share failed → try download
      }
    }
    await download();
  };

  const canShareFiles =
    typeof navigator !== "undefined" &&
    !!(navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean }).canShare &&
    typeof (navigator as Navigator & { share?: unknown }).share === "function";

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
          {canShareFiles ? (
            <Button onClick={share} disabled={!dataUrl} className="min-h-[48px] w-full sm:w-auto">
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar / Salvar QR
            </Button>
          ) : null}
          <Button
            variant={canShareFiles ? "outline" : isMobile ? "default" : "outline"}
            onClick={openInNewTab}
            disabled={!dataUrl}
            className="min-h-[48px] w-full sm:w-auto"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir imagem
          </Button>
          <Button
            variant={!canShareFiles && !isMobile ? "default" : "outline"}
            onClick={download}
            disabled={!dataUrl}
            className="min-h-[48px] w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar PNG
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="min-h-[48px] w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
