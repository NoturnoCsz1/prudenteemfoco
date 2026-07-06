import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, Flashlight, FlashlightOff, RefreshCw, RotateCw, XCircle } from "lucide-react";

type Props = {
  onDecoded: (text: string) => void;
  paused?: boolean;
  onClose?: () => void;
};

type CamState = "starting" | "active" | "error";

export function QrScanner({ onDecoded, paused, onClose }: Props) {
  const rid = useId().replace(/[^a-z0-9]/gi, "");
  const containerId = `qr-scanner-region-${rid}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastDecodedRef = useRef<{ text: string; at: number } | null>(null);
  const runningRef = useRef(false);
  const pausedRef = useRef<boolean>(!!paused);
  const containerReadyRef = useRef(false);

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIdx, setCameraIdx] = useState(0);
  const [useFacingMode, setUseFacingMode] = useState(true); // try facingMode first for speed
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [state, setState] = useState<CamState>("starting");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    pausedRef.current = !!paused;
  }, [paused]);

  // Enumerate cameras (best-effort — used only if facingMode start fails)
  useEffect(() => {
    let mounted = true;
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!mounted || !devices) return;
        const sorted = [...devices].sort((a, b) => {
          const score = (l: string) =>
            /back|rear|traseira|environment/i.test(l) ? -1 : /front|frontal|user/i.test(l) ? 1 : 0;
          return score(a.label) - score(b.label);
        });
        setCameras(sorted.map((d) => ({ id: d.id, label: d.label || "Câmera" })));
      })
      .catch(() => {
        // ignore; we'll surface errors from start()
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState("starting");
    setErrorMsg(null);

    const start = async () => {
      // Ensure container is mounted before starting.
      const el = document.getElementById(containerId);
      if (!el) {
        // Retry once on next frame in case layout not committed yet.
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      if (!document.getElementById(containerId)) {
        if (!cancelled) {
          setErrorMsg("Container do scanner não encontrado");
          setState("error");
        }
        return;
      }
      containerReadyRef.current = true;

      if (runningRef.current) return;

      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;

      const decodeCb = (decodedText: string) => {
        if (cancelled) return;
        if (pausedRef.current) return;
        const now = Date.now();
        const last = lastDecodedRef.current;
        if (last && last.text === decodedText && now - last.at < 1500) return;
        lastDecodedRef.current = { text: decodedText, at: now };
        onDecoded(decodedText);
      };

      const config = {
        fps: 12,
        qrbox: (w: number, h: number) => {
          const side = Math.max(80, Math.floor(Math.min(w, h) * 0.7));
          return { width: side, height: side };
        },
        aspectRatio: 1,
      };

      const tryStart = async (source: MediaTrackConstraints | { deviceId: { exact: string } }) => {
        await scanner.start(source, config, decodeCb, () => {});
      };

      try {
        if (useFacingMode) {
          try {
            await tryStart({ facingMode: { ideal: "environment" } } as MediaTrackConstraints);
          } catch {
            // Fall back to first available device
            if (cameras.length > 0) {
              await tryStart({ deviceId: { exact: cameras[cameraIdx]?.id ?? cameras[0].id } });
            } else {
              throw new Error("Nenhuma câmera disponível");
            }
          }
        } else {
          if (cameras.length === 0) throw new Error("Nenhuma câmera detectada");
          const cam = cameras[cameraIdx] ?? cameras[0];
          await tryStart({ deviceId: { exact: cam.id } });
        }
        runningRef.current = true;
        if (!cancelled) setState("active");

        try {
          const capsUnknown = (scanner as unknown as { getRunningTrackCapabilities?: () => unknown }).getRunningTrackCapabilities?.();
          const caps = capsUnknown as { torch?: boolean } | undefined;
          setTorchSupported(Boolean(caps?.torch));
        } catch {
          setTorchSupported(false);
        }
      } catch (e) {
        if (cancelled) return;
        const err = e as { name?: string; message?: string };
        let msg = err?.message || "Falha ao iniciar câmera";
        if (err?.name === "NotAllowedError" || /permission|denied/i.test(msg))
          msg = "Permissão da câmera negada. Autorize nas configurações do navegador.";
        else if (err?.name === "NotFoundError" || /not\s*found/i.test(msg))
          msg = "Nenhuma câmera encontrada no dispositivo.";
        else if (err?.name === "NotReadableError" || /in use|busy|readable/i.test(msg))
          msg = "Câmera em uso por outro aplicativo. Feche e tente novamente.";
        setErrorMsg(msg);
        setState("error");
      }
    };

    const stop = async () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      try {
        if (runningRef.current) await s.stop();
      } catch {
        // ignore
      } finally {
        runningRef.current = false;
        try {
          await s.clear();
        } catch {
          // ignore
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraIdx, useFacingMode, attempt]);

  const toggleTorch = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      const constraints = { advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet] } as MediaTrackConstraints;
      await (s as unknown as { applyVideoConstraints: (c: MediaTrackConstraints) => Promise<void> }).applyVideoConstraints(constraints);
      setTorchOn((v) => !v);
    } catch {
      // ignore
    }
  };

  const switchCamera = () => {
    // Prefer switching between enumerated devices if we have any; otherwise flip facingMode.
    if (cameras.length >= 2) {
      setUseFacingMode(false);
      setCameraIdx((i) => (i + 1) % cameras.length);
    } else {
      setUseFacingMode((v) => !v);
    }
  };

  const retry = () => {
    setAttempt((n) => n + 1);
  };

  return (
    <div className="relative isolate w-full">
      <div
        className="relative w-full overflow-hidden bg-black"
        style={{ height: "min(70vh, 420px)" }}
      >
        <div
          id={containerId}
          className="absolute inset-0 [&_video]:!absolute [&_video]:!inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover [&_video]:!block"
        />
        {/* Guide overlay only while active */}
        {state === "active" ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="aspect-square w-[70%] max-w-[280px] rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        ) : null}

        {state === "starting" ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
            <Camera className="h-6 w-6 animate-pulse" />
            <div className="text-sm">Iniciando câmera…</div>
          </div>
        ) : null}

        {state === "error" ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 px-4 text-center text-white">
            <Camera className="h-8 w-8 text-red-300" />
            <div className="text-sm font-semibold">Câmera indisponível</div>
            <div className="max-w-xs text-xs opacity-80">{errorMsg}</div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={retry}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-black"
              >
                <RotateCw className="h-4 w-4" /> Tentar novamente
              </button>
              {cameras.length > 1 || useFacingMode ? (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-white/40 px-3 text-sm"
                >
                  <RefreshCw className="h-4 w-4" /> Trocar câmera
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative z-20 mt-3 flex flex-wrap items-center justify-center gap-2 px-2 pb-2">
        {torchSupported && state === "active" ? (
          <button
            type="button"
            onClick={toggleTorch}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm"
          >
            {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
            {torchOn ? "Desligar" : "Lanterna"}
          </button>
        ) : null}
        {(cameras.length > 1 || state === "active") ? (
          <button
            type="button"
            onClick={switchCamera}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm"
          >
            <RefreshCw className="h-4 w-4" /> Trocar câmera
          </button>
        ) : null}
        <button
          type="button"
          onClick={retry}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm"
        >
          <RotateCw className="h-4 w-4" /> Reiniciar
        </button>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm"
          >
            <XCircle className="h-4 w-4" /> Fechar
          </button>
        ) : null}
      </div>
    </div>
  );
}
