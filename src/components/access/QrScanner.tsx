import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, Flashlight, FlashlightOff, RefreshCw, XCircle } from "lucide-react";

type Props = {
  onDecoded: (text: string) => void;
  paused?: boolean;
  onClose?: () => void;
};

/**
 * Camera-based QR scanner using html5-qrcode.
 * - Prefers rear camera.
 * - Debounces identical reads.
 * - Pauses on decode; parent controls when to resume via `paused`.
 * - Exposes torch/switch camera when the device/browser supports it.
 */
export function QrScanner({ onDecoded, paused, onClose }: Props) {
  const containerId = "qr-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastDecodedRef = useRef<{ text: string; at: number } | null>(null);
  const runningRef = useRef(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIdx, setCameraIdx] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  // Initial camera discovery
  useEffect(() => {
    let mounted = true;
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!mounted) return;
        if (!devices || devices.length === 0) {
          setPermError("Nenhuma câmera detectada");
          return;
        }
        // Prefer back / environment / traseira
        const sorted = [...devices].sort((a, b) => {
          const score = (l: string) =>
            /back|rear|traseira|environment/i.test(l) ? -1 : /front|frontal|user/i.test(l) ? 1 : 0;
          return score(a.label) - score(b.label);
        });
        setCameras(sorted.map((d) => ({ id: d.id, label: d.label || "Câmera" })));
      })
      .catch((e) => {
        setPermError((e as Error).message || "Sem permissão para câmera");
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Start / stop scanning
  useEffect(() => {
    if (cameras.length === 0) return;
    const cam = cameras[cameraIdx];
    if (!cam) return;

    let cancelled = false;

    const start = async () => {
      if (runningRef.current) return;
      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { deviceId: { exact: cam.id } },
          {
            fps: 12,
            qrbox: (w, h) => {
              const size = Math.floor(Math.min(w, h) * 0.72);
              return { width: size, height: size };
            },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (cancelled) return;
            const now = Date.now();
            const last = lastDecodedRef.current;
            // Debounce: ignore same code within 2s
            if (last && last.text === decodedText && now - last.at < 2000) return;
            lastDecodedRef.current = { text: decodedText, at: now };
            onDecoded(decodedText);
          },
          () => {
            /* onErr — noisy per-frame; ignore */
          },
        );
        runningRef.current = true;

        // Torch support probing
        try {
          const capsUnknown = (scanner as unknown as { getRunningTrackCapabilities?: () => unknown }).getRunningTrackCapabilities?.();
          const caps = capsUnknown as { torch?: boolean } | undefined;
          setTorchSupported(Boolean(caps?.torch));
        } catch {
          setTorchSupported(false);
        }
      } catch (e) {
        setPermError((e as Error).message || "Falha ao iniciar câmera");
      }
    };

    const stop = async () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      try {
        if (runningRef.current) {
          await s.stop();
        }
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
  }, [cameras, cameraIdx]);

  // Pause/resume — pause simply resets the debounce clock so re-emissions ignore identical scans;
  // library stays running so the operator sees the camera preview under the result banner.
  useEffect(() => {
    if (paused) {
      lastDecodedRef.current = { text: "__paused__", at: Date.now() };
    }
  }, [paused]);

  const toggleTorch = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      const constraints = { advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet] } as MediaTrackConstraints;
      // applyVideoConstraints is available on the running scanner
      await (s as unknown as { applyVideoConstraints: (c: MediaTrackConstraints) => Promise<void> }).applyVideoConstraints(constraints);
      setTorchOn((v) => !v);
    } catch {
      // ignore
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    setCameraIdx((i) => (i + 1) % cameras.length);
  };

  return (
    <div className="relative w-full">
      <div
        id={containerId}
        className="mx-auto aspect-square w-full max-w-md overflow-hidden rounded-lg bg-black"
      />
      {/* Overlay guide */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[72%] w-[72%] rounded-lg border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {torchSupported ? (
          <button
            type="button"
            onClick={toggleTorch}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm"
          >
            {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
            {torchOn ? "Desligar" : "Lanterna"}
          </button>
        ) : null}
        {cameras.length > 1 ? (
          <button
            type="button"
            onClick={switchCamera}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm"
          >
            <RefreshCw className="h-4 w-4" /> Trocar câmera
          </button>
        ) : null}
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

      {permError ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <Camera className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Não foi possível acessar a câmera</div>
            <div className="opacity-80">{permError}</div>
            <div className="mt-1 opacity-80">
              Verifique a permissão do navegador e recarregue a página.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
