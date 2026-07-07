import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, Flashlight, FlashlightOff, RefreshCw, RotateCw, ShieldAlert, XCircle } from "lucide-react";

type Props = {
  onDecoded: (text: string) => void;
  paused?: boolean;
  onClose?: () => void;
};

type CamState = "idle" | "starting" | "active" | "stopping" | "error";

type CameraErrorKind =
  | "permission_denied"
  | "not_found"
  | "in_use"
  | "unsupported"
  | "insecure_context"
  | "overconstrained"
  | "unknown";

function errorDetails(err: unknown) {
  const e = err as { name?: string; message?: string; constraint?: string; stack?: string } | undefined;
  return {
    name: e?.name ?? "",
    message: e?.message ?? (typeof err === "string" ? err : ""),
    constraint: e?.constraint ?? null,
    stack: e?.stack ?? null,
  };
}

function logCameraError(label: string, err: unknown, extra?: Record<string, unknown>) {
  const d = errorDetails(err);
  // eslint-disable-next-line no-console
  console.error(`[CAMERA] ${label} name=${d.name || "unknown"} message=${d.message || "unknown"}`, {
    ...extra,
    constraint: d.constraint,
    stack: d.stack,
  });
}

function classifyCameraError(err: unknown, stage?: "permission" | "enumerate" | "start"): { kind: CameraErrorKind; message: string } {
  const e = errorDetails(err);
  const name = e?.name ?? "";
  const raw = e?.message ?? "";
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return { kind: "insecure_context", message: "A câmera exige HTTPS. Abra o site em conexão segura." };
  }
  if (name === "NotAllowedError" || /permission|denied/i.test(raw))
    return {
      kind: "permission_denied",
      message:
        stage === "start"
          ? "O navegador bloqueou a abertura da câmera pelo scanner. Verifique se a câmera está permitida para este site."
          : "Permissão da câmera negada. Autorize nas configurações do navegador.",
    };
  if (name === "NotFoundError" || /not\s*found|devices? not/i.test(raw))
    return { kind: "not_found", message: "Nenhuma câmera encontrada no dispositivo." };
  if (name === "NotReadableError" || /in use|busy|readable|could not start|not started/i.test(raw))
    return { kind: "in_use", message: "Câmera em uso por outro aplicativo. Feche outros apps e tente novamente." };
  if (name === "OverconstrainedError" || /constraint/i.test(raw))
    return { kind: "overconstrained", message: "Configuração de câmera não suportada. Tente trocar a câmera." };
  if (name === "TypeError" || /getUserMedia|mediaDevices/i.test(raw))
    return { kind: "unsupported", message: "Este navegador não suporta acesso à câmera." };
  return { kind: "unknown", message: raw || "Falha ao iniciar câmera" };
}

export function QrScanner({ onDecoded, paused, onClose }: Props) {
  const rid = useId().replace(/[^a-z0-9]/gi, "");
  const containerId = `qr-scanner-region-${rid}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastDecodedRef = useRef<{ text: string; at: number } | null>(null);
  const runningRef = useRef(false);
  const startLockRef = useRef(false);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const stopLockRef = useRef<Promise<void> | null>(null);
  const operationRef = useRef(0);
  const pausedRef = useRef<boolean>(!!paused);

  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [state, setState] = useState<CamState>("idle");
  const [errorKind, setErrorKind] = useState<CameraErrorKind | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [preferFront, setPreferFront] = useState(false);

  useEffect(() => {
    pausedRef.current = !!paused;
  }, [paused]);

  const stopScanner = async (reason: string, invalidatePendingStart = true) => {
    if (invalidatePendingStart) operationRef.current += 1;
    if (startPromiseRef.current && reason !== "before-start") {
      // eslint-disable-next-line no-console
      console.log("[CAMERA] scanner:stop waiting for pending start", { reason });
      try {
        await startPromiseRef.current;
      } catch {
        // The start error is logged at the start attempt site.
      }
    }
    const s = scannerRef.current;
    scannerRef.current = null;
    setTorchSupported(false);
    setTorchOn(false);

    if (stopLockRef.current) await stopLockRef.current;

    const task = (async () => {
      if (!s) return;
      setState((current) => (current === "active" || current === "starting" ? "stopping" : current));
      // eslint-disable-next-line no-console
      console.log("[CAMERA] scanner:stop", { reason, wasRunning: runningRef.current });
      try {
        if (runningRef.current) await s.stop();
      } catch (err) {
        logCameraError("scanner:stop:error", err, { reason });
      } finally {
        runningRef.current = false;
        // eslint-disable-next-line no-console
        console.log("[CAMERA] scanner:clear", { reason });
        try {
          await s.clear();
        } catch (err) {
          logCameraError("scanner:clear:error", err, { reason });
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

    const bootstrap = async () => {
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
      setTorchSupported(false);
      setTorchOn(false);

      // 0) Environment sanity
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

      try {
        // eslint-disable-next-line no-console
        console.log("[CAMERA] secureContext", window.isSecureContext);
        // eslint-disable-next-line no-console
        console.log("[CAMERA] mediaDevices available", Boolean(navigator.mediaDevices?.getUserMedia));
        if (navigator.permissions?.query) {
          navigator.permissions
            .query({ name: "camera" as PermissionName })
            .then((permission) => {
              // eslint-disable-next-line no-console
              console.log("[CAMERA] permissions.query result", permission.state);
            })
            .catch((err) => logCameraError("permissions.query:error", err));
        }
      } catch (err) {
        logCameraError("environment:diagnostic:error", err);
      }

      const facingPref: "environment" | "user" = preferFront ? "user" : "environment";

      await stopScanner("before-start", false);

      if (cancelled || operationRef.current !== op) {
        startLockRef.current = false;
        return;
      }

      // 1) Enumerate cameras without opening a manual MediaStream. Html5Qrcode.start owns the camera.
      let cams: { id: string; label: string }[] = [];
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        // eslint-disable-next-line no-console
        console.log("[CAMERA] enumerate:success", {
          count: videoDevices.length,
          devices: videoDevices.map((d) => ({ kind: d.kind, label: d.label ? "available" : "hidden" })),
        });
      } catch (e) {
        logCameraError("enumerate:error", e);
      }

      try {
        const list = await Html5Qrcode.getCameras();
        cams = (list ?? []).map((d) => ({ id: d.id, label: d.label || "Câmera" }));
        // eslint-disable-next-line no-console
        console.log("[CAMERA] getCameras result", { count: cams.length, labels: cams.map((c) => (c.label ? "available" : "hidden")) });
      } catch (e) {
        logCameraError("getCameras:error", e);
      }

      // Order by rear-first (or front-first if user requested)
      const sorted = [...cams].sort((a, b) => {
        const rearScore = (l: string) =>
          /back|rear|traseira|environment/i.test(l) ? -1 : /front|frontal|user/i.test(l) ? 1 : 0;
        const s = rearScore(a.label) - rearScore(b.label);
        return preferFront ? -s : s;
      });

      // Ensure container is in DOM
      if (!document.getElementById(containerId)) {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      if (!document.getElementById(containerId)) {
        if (!cancelled) {
          setErrorKind("unknown");
          setErrorMsg("Container do scanner não encontrado.");
          setState("error");
        }
        startLockRef.current = false;
        return;
      }

      // 2) Try to start — cascade: facingMode → each enumerated device → opposite facingMode.
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

      const attempts: Array<{ label: string; source: string | MediaTrackConstraints }> = [];
      attempts.push({
        label: `facingMode:${facingPref}`,
        source: { facingMode: { ideal: facingPref } } as MediaTrackConstraints,
      });
      for (const cam of sorted) {
        attempts.push({ label: `device:${cam.label}`, source: cam.id });
      }
      // Last resort: try the opposite facing
      attempts.push({
        label: `facingMode:${facingPref === "environment" ? "user" : "environment"}`,
        source: { facingMode: { ideal: facingPref === "environment" ? "user" : "environment" } } as MediaTrackConstraints,
      });

      let lastErr: unknown = null;
      try {
        for (const a of attempts) {
          if (cancelled || operationRef.current !== op) return;
          try {
            // eslint-disable-next-line no-console
            console.log(`[CAMERA] scanner:start attempt=${a.label}`);
            const startPromise = scanner.start(a.source, config, decodeCb, () => {});
            startPromiseRef.current = startPromise;
            await startPromise;
            runningRef.current = true;
            // eslint-disable-next-line no-console
            console.log("[CAMERA] scanner:start:success", { attempt: a.label });
            if (!cancelled && operationRef.current === op) setState("active");
            try {
              const capsUnknown = (scanner as unknown as { getRunningTrackCapabilities?: () => unknown }).getRunningTrackCapabilities?.();
              const caps = capsUnknown as { torch?: boolean } | undefined;
              setTorchSupported(Boolean(caps?.torch));
            } catch {
              setTorchSupported(false);
            }
            return;
          } catch (e) {
            lastErr = e;
            logCameraError("scanner:start:error", e, { attempt: a.label });
            runningRef.current = false;
          } finally {
            startPromiseRef.current = null;
          }
        }

        if (!cancelled && operationRef.current === op) {
          const c = classifyCameraError(lastErr, "start");
          setErrorKind(c.kind);
          setErrorMsg(c.message);
          setState("error");
        }
      } finally {
        startPromiseRef.current = null;
        startLockRef.current = false;
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
      startLockRef.current = false;
      stopScanner("unmount");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, preferFront]);

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

  const retry = async () => {
    await stopScanner("retry");
    setAttempt((n) => n + 1);
  };
  const flipFacing = async () => {
    await stopScanner("switch-camera");
    setPreferFront((v) => !v);
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
              {errorKind === "overconstrained" && "Câmera incompatível"}
              {(errorKind === "unknown" || !errorKind) && "Câmera indisponível"}
            </div>
            <div className="max-w-xs text-xs opacity-80">{errorMsg}</div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={retry}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-black"
              >
                <RotateCw className="h-4 w-4" />
                {errorKind === "permission_denied" ? "Solicitar permissão novamente" : "Tentar novamente"}
              </button>
              <button
                type="button"
                onClick={flipFacing}
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
            {errorKind === "permission_denied" ? (
              <div className="mt-2 max-w-xs text-[11px] opacity-70">
                Se o botão não abrir o pedido, libere manualmente em: Configurações do navegador → Site → Câmera → Permitir.
              </div>
            ) : null}
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
              onClick={flipFacing}
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
