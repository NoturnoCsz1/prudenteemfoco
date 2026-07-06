import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, Flashlight, FlashlightOff, RefreshCw, XCircle } from "lucide-react";

type Props = {
  onDecoded: (text: string) => void;
  paused?: boolean;
  onClose?: () => void;
};

export function QrScanner({ onDecoded, paused, onClose }: Props) {
  const containerId = "qr-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastDecodedRef = useRef<{ text: string; at: number } | null>(null);
  const runningRef = useRef(false);
  const pausedRef = useRef<boolean>(!!paused);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIdx, setCameraIdx] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  useEffect(() => {
    pausedRef.current = !!paused;
  }, [paused]);

  useEffect(() => {
    let mounted = true;
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!mounted) return;
        if (!devices || devices.length === 0) {
          setPermError("Nenhuma câmera detectada");
          return;
        }
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
            // Ignore reads while paused (result showing / validating).
            if (pausedRef.current) return;
            const now = Date.now();
            const last = lastDecodedRef.current;
            if (last && last.text === decodedText && now - last.at < 1500) return;
            lastDecodedRef.current = { text: decodedText, at: now };
            onDecoded(decodedText);
          },
          () => {},
        );
        runningRef.current = true;

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
  }, [cameras, cameraIdx]);

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
    if (cameras.length < 2) return;
    setCameraIdx((i) => (i + 1) % cameras.length);
  };

  return (
    <div className="relative isolate w-full">
      {/* Camera viewport — fixed responsive height, clips video overflow */}
      <div
        className="relative w-full overflow-hidden bg-black"
        style={{ height: "min(70vh, 420px)" }}
      >
        <div
          id={containerId}
          className="absolute inset-0 [&_video]:!absolute [&_video]:!inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
        />
        {/* Guide overlay */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="aspect-square w-[70%] max-w-[280px] rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      </div>

      {/* Controls below the camera, never over the video */}
      <div className="relative z-20 mt-3 flex flex-wrap items-center justify-center gap-2 px-2 pb-2">
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
        <div className="relative z-20 m-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
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
