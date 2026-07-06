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

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${(token ?? "token").slice(0, 8)}.png`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
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
