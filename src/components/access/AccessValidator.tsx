import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, QrCode, ScanLine, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { QrScanner } from "./QrScanner";
import {
  feedbackFor,
  reasonLabel,
  validateAccessToken,
  type ValidationResult,
  type ValidationStatus,
} from "@/lib/access-scanner";

type Props = {
  expectedEventId?: string | null;
  eventTitle?: string | null;
  onValidated?: (r: ValidationResult) => void;
  autoStart?: boolean;
};

const STATUS_STYLE: Record<
  ValidationStatus,
  { border: string; bg: string; text: string; icon: React.ReactNode; overlayBg: string }
> = {
  allowed: {
    border: "border-emerald-500",
    bg: "bg-emerald-500/15",
    overlayBg: "bg-emerald-600/95",
    text: "text-emerald-50",
    icon: <CheckCircle2 className="h-16 w-16" />,
  },
  already_used: {
    border: "border-amber-500",
    bg: "bg-amber-500/15",
    overlayBg: "bg-amber-500/95",
    text: "text-amber-50",
    icon: <AlertTriangle className="h-16 w-16" />,
  },
  wrong_event: {
    border: "border-amber-500",
    bg: "bg-amber-500/15",
    overlayBg: "bg-amber-500/95",
    text: "text-amber-50",
    icon: <AlertTriangle className="h-16 w-16" />,
  },
  capacity: {
    border: "border-amber-500",
    bg: "bg-amber-500/15",
    overlayBg: "bg-amber-500/95",
    text: "text-amber-50",
    icon: <AlertTriangle className="h-16 w-16" />,
  },
  revoked: {
    border: "border-red-600",
    bg: "bg-red-600/15",
    overlayBg: "bg-red-600/95",
    text: "text-red-50",
    icon: <XCircle className="h-16 w-16" />,
  },
  expired: {
    border: "border-red-600",
    bg: "bg-red-600/15",
    overlayBg: "bg-red-600/95",
    text: "text-red-50",
    icon: <XCircle className="h-16 w-16" />,
  },
  invalid: {
    border: "border-red-600",
    bg: "bg-red-600/15",
    overlayBg: "bg-red-600/95",
    text: "text-red-50",
    icon: <XCircle className="h-16 w-16" />,
  },
  network_error: {
    border: "border-amber-500",
    bg: "bg-amber-500/15",
    overlayBg: "bg-amber-500/95",
    text: "text-amber-50",
    icon: <AlertTriangle className="h-16 w-16" />,
  },
};

const AUTO_CLEAR_MS = 2200;

export function AccessValidator({ expectedEventId, eventTitle, onValidated, autoStart = false }: Props) {
  const [scanning, setScanning] = useState(autoStart);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<ValidationResult[]>([]);
  const [manual, setManual] = useState("");
  const clearTimerRef = useRef<number | null>(null);

  const lockRef = useRef(false);
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    };
  }, []);

  const submit = async (token: string) => {
    if (lockRef.current || busy) return;
    // Multi-frame dedupe: same token within 3s is ignored silently.
    const now = Date.now();
    const last = lastTokenRef.current;
    if (last && last.token === token && now - last.at < 3000) return;
    lastTokenRef.current = { token, at: now };

    lockRef.current = true;
    setBusy(true);
    setResult(null);
    try {
      const r = await validateAccessToken(token, expectedEventId ?? null);
      setResult(r);
      setHistory((prev) => [r, ...prev].slice(0, 20));
      feedbackFor(r.status);
      onValidated?.(r);
    } finally {
      setBusy(false);
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = window.setTimeout(() => {
        setResult(null);
        lockRef.current = false;
        // Also release last token so the operator can rescan the same QR fresh.
        lastTokenRef.current = null;
      }, AUTO_CLEAR_MS);
    }
  };

  const dismissResult = () => {
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    setResult(null);
    lockRef.current = false;
    lastTokenRef.current = null;
  };

  const runManual = async () => {
    const v = manual.trim();
    if (!v) return;
    setManual("");
    lastTokenRef.current = null;
    lockRef.current = false;
    await submit(v);
  };

  return (
    <div className="space-y-4">
      {eventTitle ? (
        <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs">
          Validando entradas para <strong>{eventTitle}</strong>. QRs de outros
          eventos serão recusados sem serem consumidos.
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card p-3">
        {!scanning ? (
          <Button onClick={() => setScanning(true)} className="h-14 w-full text-base" size="lg">
            <ScanLine className="mr-2 h-5 w-5" />
            Abrir scanner
          </Button>
        ) : (
          <div className="relative isolate overflow-hidden rounded-lg bg-black">
            <QrScanner
              onDecoded={submit}
              paused={busy || result !== null}
              onClose={() => {
                setScanning(false);
                dismissResult();
              }}
            />

            {busy ? (
              <div className="pointer-events-none absolute inset-x-0 top-2 z-30 mx-auto flex w-fit items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs shadow">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Validando…
              </div>
            ) : null}

            {result ? <ResultOverlay r={result} onDismiss={dismissResult} /> : null}
          </div>
        )}
      </div>

      <details className="rounded-lg border border-border bg-card">
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
          <QrCode className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Validação manual</span>
          <span className="ml-1 text-xs text-muted-foreground">
            Use caso a câmera não consiga ler o QR.
          </span>
        </summary>
        <div className="border-t border-border p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Cole o token…"
              className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 font-mono text-xs"
            />
            <Button onClick={runManual} disabled={busy || !manual.trim()} className="h-11">
              Validar
            </Button>
          </div>
        </div>
      </details>

      {history.length > 0 ? (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Últimas leituras desta sessão
          </div>
          <ul className="space-y-1 text-xs">
            {history.map((h, i) => {
              const s = STATUS_STYLE[h.status];
              return (
                <li
                  key={i}
                  className={`flex items-center justify-between rounded-md border ${s.border} ${s.bg} px-2 py-1.5`}
                >
                  <span className="font-semibold">{h.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {h.detail ?? reasonLabel(h.reason) ?? ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ResultOverlay({ r, onDismiss }: { r: ValidationResult; onDismiss: () => void }) {
  const s = STATUS_STYLE[r.status];
  return (
    <button
      type="button"
      onClick={onDismiss}
      className={`absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 px-4 text-center ${s.overlayBg} ${s.text}`}
      aria-label="Fechar resultado"
    >
      {s.icon}
      <div className="text-2xl font-black uppercase tracking-widest">{r.title}</div>
      {r.detail ? <div className="text-sm opacity-95">{r.detail}</div> : null}
      {r.remaining_capacity !== null && r.remaining_capacity !== undefined ? (
        <div className="text-xs opacity-90">Capacidade restante: {r.remaining_capacity}</div>
      ) : null}
      <div className="mt-2 text-[11px] uppercase tracking-widest opacity-80">
        Toque para continuar
      </div>
    </button>
  );
}
