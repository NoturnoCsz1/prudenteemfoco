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
  /** If set, tokens whose event_id doesn't match are refused without consuming. */
  expectedEventId?: string | null;
  eventTitle?: string | null;
  onValidated?: (r: ValidationResult) => void;
  autoStart?: boolean;
};

const STATUS_STYLE: Record<
  ValidationStatus,
  { border: string; bg: string; text: string; icon: React.ReactNode }
> = {
  allowed: {
    border: "border-emerald-500/60",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    icon: <CheckCircle2 className="h-8 w-8" />,
  },
  already_used: {
    border: "border-amber-500/60",
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    icon: <AlertTriangle className="h-8 w-8" />,
  },
  wrong_event: {
    border: "border-amber-500/60",
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    icon: <AlertTriangle className="h-8 w-8" />,
  },
  revoked: {
    border: "border-destructive/60",
    bg: "bg-destructive/15",
    text: "text-destructive",
    icon: <XCircle className="h-8 w-8" />,
  },
  expired: {
    border: "border-destructive/60",
    bg: "bg-destructive/15",
    text: "text-destructive",
    icon: <XCircle className="h-8 w-8" />,
  },
  capacity: {
    border: "border-destructive/60",
    bg: "bg-destructive/15",
    text: "text-destructive",
    icon: <XCircle className="h-8 w-8" />,
  },
  invalid: {
    border: "border-destructive/60",
    bg: "bg-destructive/15",
    text: "text-destructive",
    icon: <XCircle className="h-8 w-8" />,
  },
  network_error: {
    border: "border-amber-500/60",
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    icon: <AlertTriangle className="h-8 w-8" />,
  },
};

const COOLDOWN_MS = 1600;

export function AccessValidator({ expectedEventId, eventTitle, onValidated, autoStart = false }: Props) {
  const [scanning, setScanning] = useState(autoStart);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<ValidationResult[]>([]);
  const [manual, setManual] = useState("");
  const cooldownRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) window.clearTimeout(cooldownRef.current);
    };
  }, []);

  const submit = async (token: string) => {
    if (busy) return;
    setBusy(true);
    const r = await validateAccessToken(token, expectedEventId ?? null);
    setBusy(false);
    setResult(r);
    setHistory((prev) => [r, ...prev].slice(0, 20));
    feedbackFor(r.status);
    onValidated?.(r);

    // Cooldown before allowing next scan
    if (cooldownRef.current) window.clearTimeout(cooldownRef.current);
    cooldownRef.current = window.setTimeout(() => {
      setResult(null);
    }, COOLDOWN_MS);
  };

  const runManual = async () => {
    const v = manual.trim();
    if (!v) return;
    setManual("");
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

      {/* Scanner */}
      <div className="rounded-lg border border-border bg-card p-3">
        {!scanning ? (
          <Button
            onClick={() => setScanning(true)}
            className="h-14 w-full text-base"
            size="lg"
          >
            <ScanLine className="mr-2 h-5 w-5" />
            Abrir scanner
          </Button>
        ) : (
          <div className="relative">
            <QrScanner
              onDecoded={submit}
              paused={busy || result !== null}
              onClose={() => setScanning(false)}
            />
            {/* Result overlay */}
            {result ? <ResultOverlay r={result} /> : null}
            {busy ? (
              <div className="absolute inset-x-0 top-2 mx-auto flex w-fit items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs shadow">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Validando…
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Manual fallback */}
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

      {/* Local history */}
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
                  <span className={`font-semibold ${s.text}`}>{h.title}</span>
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

function ResultOverlay({ r }: { r: ValidationResult }) {
  const s = STATUS_STYLE[r.status];
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border-4 ${s.border} ${s.bg} backdrop-blur-sm`}
    >
      <div className={`flex flex-col items-center gap-2 px-4 text-center ${s.text}`}>
        {s.icon}
        <div className="text-lg font-bold uppercase tracking-widest">{r.title}</div>
        {r.detail ? <div className="text-xs opacity-80">{r.detail}</div> : null}
        {r.remaining_capacity !== null && r.remaining_capacity !== undefined ? (
          <div className="text-[11px] opacity-80">
            Capacidade restante: {r.remaining_capacity}
          </div>
        ) : null}
      </div>
    </div>
  );
}
