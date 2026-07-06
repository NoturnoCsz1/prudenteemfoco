import { useEffect, useState } from "react";
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
};

export function QrCodeModal({ open, onOpenChange, token, title, description, meta }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!open || !token) {
      setDataUrl(null);
      return;
    }
    setBusy(true);
    QRCode.toDataURL(token, { width: 512, margin: 2, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
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

  const dataUrlToBlob = async (): Promise<Blob | null> => {
    if (!dataUrl) return null;
    try {
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch {
      return null;
    }
  };

  const download = async () => {
    const blob = await dataUrlToBlob();
    if (!blob) {
      toast.error("Não foi possível gerar o PNG");
      return;
    }
    const filename = `qr-${(token ?? "token").slice(0, 8)}.png`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const share = async () => {
    const blob = await dataUrlToBlob();
    if (!blob) {
      toast.error("Não foi possível gerar o PNG");
      return;
    }
    const filename = `qr-${(token ?? "token").slice(0, 8)}.png`;
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

        <div className="flex flex-col items-center gap-3">
          {busy || !dataUrl ? (
            <div className="flex h-64 w-64 items-center justify-center rounded-md border border-dashed border-border">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <img
              src={dataUrl}
              alt="QR Code"
              className="h-64 w-64 rounded-md border border-border bg-white p-2"
            />
          )}

          {meta && meta.length > 0 ? (
            <dl className="w-full space-y-1 text-xs">
              {meta.map((m) => (
                <div key={m.label} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{m.label}</dt>
                  <dd className="text-right font-medium">{m.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {token ? (
            <div className="w-full">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Token (não será exibido novamente)
              </p>
              <div className="flex items-center gap-1">
                <code className="min-w-0 flex-1 truncate rounded bg-muted/60 px-2 py-1 font-mono text-[11px]">
                  {token}
                </code>
                <Button size="sm" variant="outline" onClick={copy}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={download} disabled={!dataUrl} className="w-full sm:w-auto">
            Baixar PNG
          </Button>
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
