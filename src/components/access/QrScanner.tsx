import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, Flashlight, FlashlightOff, RefreshCw, RotateCw, ShieldAlert, XCircle } from "lucide-react";

type Props = {
  onDecoded: (text: string) => void;
  paused?: boolean;
  onClose?: () => void;
};

type CamState = "idle" | "starting" | "active" | "stopping" | "error";
type CameraMode = "environment" | "device";

type CameraErrorKind =
  | "permission_denied"
  | "not_found"
  | "in_use"
  | "unsupported"
  | "insecure_context"
  | "layout"
  | "unknown";

type NormalizedCameraError = {
  type: string;
  constructor: string;
  name: string;
  message: string;
  constraint: string | null;
  string: string;
  stack: string | null;
};

const MIN_CONTAINER_SIZE = 200;

function normalizeCameraError(error: unknown): NormalizedCameraError {
  const maybe = error as { constructor?: { name?: string }; name?: string; message?: string; constraint?: string; stack?: string } | null;
  const stringValue = (() => {
    try {
      return String(error);
    } catch {
      return "Unknown camera error";
    }
  })();

  return {
    type: typeof error,
    constructor: maybe?.constructor?.name ?? "Unknown",
    name: maybe?.name ?? (typeof error === "string" ? "Html5QrcodeError" : "UnknownError"),
    message: maybe?.message ?? (typeof error === "string" ? error : stringValue),
    constraint: maybe?.constraint ?? null,
    string: stringValue,
    stack: maybe?.stack ?? null,
  };
}

function classifyCameraError(error: NormalizedCameraError): { kind: CameraErrorKind; message: string } {
  const text = `${error.name} ${error.message} ${error.string}`;

  if (typeof window !== "undefined" && !window.isSecureContext) {
    return { kind: "insecure_context", message: "A câmera exige HTTPS. Abra o site em conexão segura." };
  }
  if (/NotAllowedError|permission|denied|not allowed/i.test(text)) {
    return {
      kind: "permission_denied",
      message: `Falha ao iniciar câmera\n${error.name}: ${error.message || error.string}`,
    };
  }
  if (/NotFoundError|not found|device not found|requested device/i.test(text)) {
    return { kind: "not_found", message: `Falha ao iniciar câmera\n${error.name}: ${error.message || error.string}` };
  }
  if (/NotReadableError|could not start|video source|in use|busy|readable|track start/i.test(text)) {
    return { kind: "in_use", message: `Falha ao iniciar câmera\n${error.name}: ${error.message || error.string}` };
  }

  return { kind: "unknown", message: `Falha ao iniciar câmera\n${error.message || error.string}` };
}

function describeContainer(elementId: string) {
  const el = document.getElementById(elementId);
  const rect = el?.getBoundingClientRect();
  return {
    element: el,
    info: {
      exists: Boolean(el),
      width: el?.clientWidth ?? 0,
      height: el?.clientHeight ?? 0,
      rect: rect
        ? {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
          }
        : null,
    },
  };
}

async function waitForSizedContainer(elementId: string, shouldContinue: () => boolean) {
  for (let i = 0; i < 12; i += 1) {
    const { element, info } = describeContainer(elementId);
    // eslint-disable-next-line no-console
    console.log("[CAMERA] container", info);
    if (element && info.width >= MIN_CONTAINER_SIZE && info.height >= MIN_CONTAINER_SIZE) return true;
    if (!shouldContinue()) return false;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return false;
}

export function QrScanner({ onDecoded, paused, onClose }: Props) {
  const rid = useId().replace(/[^a-z0-9]/gi, "");
  const elementId = `qr-scanner-region-${rid}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const runningRef = useRef(false);
  const startLockRef = useRef(false);
  const startPromiseRef = useRef<Promise<unknown> | null>(null);
  const stopLockRef = useRef<Promise<void> | null>(null);
  const operationRef = useRef(0);
  const pausedRef = useRef(Boolean(paused));
  const lastDecodedRef = useRef<{ text: string; at: number } | null>(null);

  const [state, setState] = useState<CamState>("idle");
  const [errorKind, setErrorKind] = useState<CameraErrorKind | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<CameraMode>("environment");
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    pausedRef.current = Boolean(paused);
  }, [paused]);

  const stopScanner = async (reason: string, invalidatePendingStart = true) => {
    if (invalidatePendingStart) operationRef.current += 1;
    if (startPromiseRef.current) {
      // eslint-disable-next-line no-console
      console.log("[CAMERA] scanner:stop waiting for pending start", { reason });
      try {
        await startPromiseRef.current;
      } catch {
        // Start errors are logged where they happen.
      }
    }

    const scanner = scannerRef.current;
    scannerRef.current = null;
    setTorchOn(false);
    setTorchSupported(false);

    if (stopLockRef.current) await stopLockRef.current;

    const task = (async () => {
      if (!scanner) return;
      setState((current) => (current === "active" || current === "starting" ? "stopping" : current));
      // eslint-disable-next-line no-console
      console.log("[CAMERA] scanner:stop", { reason, wasRunning: runningRef.current });
      try {
        if (runningRef.current) await scanner.stop();
      } catch (error) {
        const detail = normalizeCameraError(error);
        // eslint-disable-next-line no-console
        console.error("[CAMERA] scanner:stop:error", detail);
      } finally {
        runningRef.current = false;
        // eslint-disable-next-line no-console
        console.log("[CAMERA] scanner:clear", { reason });
        try {
          await scanner.clear();
        } catch (error) {
          const detail = normalizeCameraError(error);
          // eslint-disable-next-line no-console
          console.error("[CAMERA] scanner:clear:error", detail);
        }
      }
    })();

    stopLockRef.current = task;
    try {
      await task;
    } finally {
      if (stopLockRef.current === task) stopLockRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const startScanner = async () => {
      if (startLockRef.current) {
        // eslint-disable-next-line no-console
        console.log("[CAMERA] scanner:start skipped - start already in progress");
        return;
      }

      startLockRef.current = true;
      const op = operationRef.current + 1;
      operationRef.current = op;
      setState("starting");
      setErrorKind(null);
      setErrorMsg(null);
      setTorchOn(false);
      setTorchSupported(false);

      try {
        // eslint-disable-next-line no-console
        console.log("[CAMERA] secureContext", typeof window !== "undefined" ? window.isSecureContext : false);
        // eslint-disable-next-line no-console
        console.log("[CAMERA] mediaDevices available", Boolean(navigator.mediaDevices?.getUserMedia));
      } catch {
        // ignore diagnostics only
      }

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setErrorKind("unsupported");
          setErrorMsg("Este navegador não suporta acesso à câmera.");
          setState("error");
        }
        startLockRef.current = false;
        return;
      }

      if (typeof window !== "undefined" && !window.isSecureContext) {
        if (!cancelled) {
          setErrorKind("insecure_context");
          setErrorMsg("A câmera exige HTTPS. Abra o site em conexão segura.");
          setState("error");
        }
        startLockRef.current = false;
        return;
      }

      if (navigator.permissions?.query) {
        navigator.permissions
          .query({ name: "camera" as PermissionName })
          .then((permission) => {
            // eslint-disable-next-line no-console
            console.log("[CAMERA] permissions.query result", permission.state);
          })
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.error("[CAMERA] permissions.query error", normalizeCameraError(error));
          });
      }

      try {
        await stopScanner("before-start", false);
        await new Promise((resolve) => requestAnimationFrame(resolve));

        if (cancelled || operationRef.current !== op) return;

        const sized = await waitForSizedContainer(elementId, () => !cancelled && operationRef.current === op);
        if (!sized) {
          if (!cancelled && operationRef.current === op) {
            setErrorKind("layout");
            setErrorMsg("Falha ao iniciar câmera\nÁrea do scanner sem tamanho válido.");
            setState("error");
          }
          return;
        }

        let startSource: string | MediaTrackConstraints = { facingMode: "environment" };
        let startLabel = "facingMode:environment";

        if (mode === "device") {
          // Manual switch only: enumerate after the primary path has already been isolated.
          const cameras = await Html5Qrcode.getCameras();
          // eslint-disable-next-line no-console
          console.log("[CAMERA] getCameras result", {
            count: cameras.length,
            labels: cameras.map((camera) => (camera.label ? "available" : "hidden")),
          });
          if (cameras.length > 0) {
            const index = selectedDeviceIndex % cameras.length;
            startSource = cameras[index].id;
            startLabel = `device:index-${index}`;
          }
        }

        const scanner = new Html5Qrcode(elementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;

        const decodeCb = (decodedText: string) => {
          if (cancelled || pausedRef.current) return;
          const now = Date.now();
          const last = lastDecodedRef.current;
          if (last && last.text === decodedText && now - last.at < 1500) return;
          lastDecodedRef.current = { text: decodedText, at: now };
          onDecoded(decodedText);
        };

        const config = {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const safeWidth = Math.max(0, viewfinderWidth - 20);
            const safeHeight = Math.max(0, viewfinderHeight - 20);
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.max(150, Math.floor(minEdge * 0.7));
            return {
              width: Math.max(1, Math.min(size, safeWidth)),
              height: Math.max(1, Math.min(size, safeHeight)),
            };
          },
        };

        // eslint-disable-next-line no-console
        console.log(`[CAMERA] scanner:start attempt=${startLabel}`);
        const startPromise = scanner.start(startSource, config, decodeCb, () => {});
        startPromiseRef.current = startPromise;
        await startPromise;
        startPromiseRef.current = null;
        runningRef.current = true;
        // eslint-disable-next-line no-console
        console.log("[CAMERA] scanner:start:success", { attempt: startLabel });

        if (!cancelled && operationRef.current === op) {
          setState("active");
          try {
            const capsUnknown = (scanner as unknown as { getRunningTrackCapabilities?: () => unknown }).getRunningTrackCapabilities?.();
            const caps = capsUnknown as { torch?: boolean } | undefined;
            setTorchSupported(Boolean(caps?.torch));
          } catch {
            setTorchSupported(false);
          }
        }
      } catch (error) {
        startPromiseRef.current = null;
        runningRef.current = false;
        const detail = normalizeCameraError(error);
        // eslint-disable-next-line no-console
        console.error("[CAMERA] START FAILED RAW:", error);
        // eslint-disable-next-line no-console
        console.error("[CAMERA] START FAILED DETAIL:", detail);

        if (!cancelled && operationRef.current === op) {
          const classified = classifyCameraError(detail);
          setErrorKind(classified.kind);
          setErrorMsg(classified.message);
          setState("error");
        }
      } finally {
        startPromiseRef.current = null;
        startLockRef.current = false;
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      startLockRef.current = false;
      stopScanner("unmount");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, mode, selectedDeviceIndex]);

  const retry = async () => {
    if (startLockRef.current || stopLockRef.current) return;
    await stopScanner("retry");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    setMode("environment");
    setAttempt((n) => n + 1);
  };

  const flipCamera = async () => {
    if (startLockRef.current || stopLockRef.current) return;
    await stopScanner("switch-camera");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    setMode("device");
    setSelectedDeviceIndex((n) => n + 1);
  };

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const constraints = { advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet] } as MediaTrackConstraints;
      await (scanner as unknown as { applyVideoConstraints: (c: MediaTrackConstraints) => Promise<void> }).applyVideoConstraints(constraints);
      setTorchOn((value) => !value);
    } catch {
      // ignore torch failures
    }
  };

  return (
    <div className="relative isolate w-full">
      <div className="relative w-full overflow-hidden bg-black" style={{ height: "min(70vh, 420px)" }}>
        <div id={elementId} className="h-full w-full overflow-hidden [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

        {state === "active" ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="aspect-square w-[70%] max-w-[280px] rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        ) : null}

        {state === "starting" || state === "stopping" ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
            <Camera className="h-6 w-6 animate-pulse" />
            <div className="text-sm">{state === "stopping" ? "Liberando câmera…" : "Iniciando câmera…"}</div>
            {state === "starting" ? <div className="text-[11px] opacity-70">Toque em "Permitir" se o navegador perguntar.</div> : null}
          </div>
        ) : null}

        {state === "error" ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/90 px-4 text-center text-white">
            <ShieldAlert className="h-8 w-8 text-red-300" />
            <div className="text-sm font-semibold">
              {errorKind === "permission_denied" && "Permissão negada"}
              {errorKind === "not_found" && "Nenhuma câmera encontrada"}
              {errorKind === "in_use" && "Câmera ocupada"}
              {errorKind === "unsupported" && "Navegador sem suporte"}
              {errorKind === "insecure_context" && "Conexão insegura"}
              {errorKind === "layout" && "Área da câmera indisponível"}
              {(errorKind === "unknown" || !errorKind) && "Câmera indisponível"}
            </div>
            <div className="max-w-xs whitespace-pre-line text-xs opacity-80">{errorMsg}</div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={retry}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-black"
              >
                <RotateCw className="h-4 w-4" /> Tentar novamente
              </button>
              <button
                type="button"
                onClick={flipCamera}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-white/40 px-3 text-sm"
              >
                <RefreshCw className="h-4 w-4" /> Trocar câmera
              </button>
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-white/40 px-3 text-sm"
                >
                  <XCircle className="h-4 w-4" /> Fechar
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
        {state !== "error" ? (
          <>
            <button
              type="button"
              onClick={flipCamera}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm"
            >
              <RefreshCw className="h-4 w-4" /> Trocar câmera
            </button>
            <button
              type="button"
              onClick={retry}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm"
            >
              <RotateCw className="h-4 w-4" /> Reiniciar
            </button>
          </>
        ) : null}
        {onClose && state !== "error" ? (
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