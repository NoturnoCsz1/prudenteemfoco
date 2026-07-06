import { supabase } from "@/integrations/supabase/client";

export type ValidationStatus =
  | "allowed"
  | "already_used"
  | "wrong_event"
  | "revoked"
  | "expired"
  | "capacity"
  | "invalid"
  | "network_error";


export type ValidationResult = {
  status: ValidationStatus;
  title: string;
  detail?: string | null;
  reason?: string | null;
  rule?: string | null;
  session_id?: string | null;
  event_id?: string | null;
  remaining_capacity?: number | null;
  subject_type?: string | null;
};

const sb = supabase as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

function classifyReason(reason: string | null | undefined): ValidationStatus {
  if (!reason) return "invalid";
  if (reason === "capacity_reached") return "already_used";
  if (reason.startsWith("token_revoked")) return "revoked";
  if (reason.startsWith("token_expired")) return "expired";
  if (reason === "target_event_mismatch" || reason === "subject_event_mismatch")
    return "wrong_event";
  if (
    reason === "credential_inactive" ||
    reason === "invite_not_active" ||
    reason === "invite_scope_restricted" ||
    reason === "insufficient_role" ||
    reason === "not_a_member" ||
    reason === "explicit_deny_rule"
  )
    return "invalid";
  return "invalid";
}

const REASON_LABEL: Record<string, string> = {
  token_revoked: "Token revogado",
  token_expired: "Token expirado",
  capacity_reached: "Limite de utilizações atingido",
  target_event_mismatch: "QR pertence a outro evento",
  subject_event_mismatch: "Sujeito de outro evento",
  credential_inactive: "Credencial inativa",
  invite_not_active: "Convite não está ativo",
  invite_scope_restricted: "Convite fora do escopo",
  insufficient_role: "Perfil sem permissão",
  not_a_member: "Não é membro da organização",
  explicit_deny_rule: "Regra de bloqueio aplicada",
};



export function reasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return REASON_LABEL[reason] ?? reason;
}

/**
 * Try to resolve the event of a token without consuming it.
 * Returns null when the token is unknown or the operator can't see its org.
 */
export async function peekTokenEvent(
  token: string,
): Promise<{ event_id: string | null; status: string | null } | null> {
  try {
    const { data, error } = await sb.rpc("peek_access_token_event", {
      _token_plain: token,
    });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : (data as { event_id?: string; status?: string } | null);
    if (!row) return null;
    return {
      event_id: (row as { event_id?: string }).event_id ?? null,
      status: (row as { status?: string }).status ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Validate a QR / token.
 * - When `expectedEventId` is passed, we peek first and refuse other events
 *   WITHOUT consuming the token.
 */
export async function validateAccessToken(
  token: string,
  expectedEventId?: string | null,
): Promise<ValidationResult> {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length < 8) {
    return { status: "invalid", title: "QR inválido", detail: "Conteúdo insuficiente" };
  }

  // Event guard (avoid consuming a token belonging to another event).
  if (expectedEventId) {
    const peek = await peekTokenEvent(trimmed);
    if (peek && peek.event_id && peek.event_id !== expectedEventId) {
      return {
        status: "wrong_event",
        title: "QR de outro evento",
        detail: "Este QR pertence a outro evento e não foi consumido.",
        event_id: peek.event_id,
      };
    }
  }

  try {
    const { data, error } = await sb.rpc("redeem_access_token", {
      _token_plain: trimmed,
    });
    if (error) {
      const message = (error as { message?: string }).message ?? "";
      if (message.includes("token not found")) {
        return { status: "invalid", title: "QR inválido", reason: "not_found" };
      }
      if (message.includes("forbidden")) {
        return {
          status: "invalid",
          title: "Sem permissão",
          detail: "Você não é membro ativo desta organização.",
        };
      }
      return {
        status: "network_error",
        title: "Não foi possível validar",
        detail: message || "Erro desconhecido",
      };
    }

    const row = (Array.isArray(data) ? data[0] : data) as {
      session_id?: string;
      status?: "active" | "blocked" | "consumed";
      reason?: string | null;
      rule_applied?: string | null;
      remaining_capacity?: number | null;
    } | null;

    if (!row) {
      return { status: "invalid", title: "QR inválido" };
    }

    if (row.status === "active") {
      return {
        status: "allowed",
        title: "ENTRADA LIBERADA",
        session_id: row.session_id ?? null,
        reason: row.reason,
        rule: row.rule_applied,
        remaining_capacity: row.remaining_capacity ?? null,
      };
    }

    // blocked
    const kind = classifyReason(row.reason);
    const label = reasonLabel(row.reason);
    const titles: Record<ValidationStatus, string> = {
      allowed: "ENTRADA LIBERADA",
      already_used: "ACESSO JÁ UTILIZADO",
      wrong_event: "QR DE OUTRO EVENTO",
      revoked: "ACESSO REVOGADO",
      expired: "ACESSO EXPIRADO",
      capacity: "LIMITE ESGOTADO",
      invalid: "QR INVÁLIDO",
      network_error: "NÃO FOI POSSÍVEL VALIDAR",
    };
    return {
      status: kind,
      title: titles[kind],
      detail: label,
      reason: row.reason ?? null,
      rule: row.rule_applied ?? null,
      session_id: row.session_id ?? null,
    };
  } catch (e) {
    return {
      status: "network_error",
      title: "Não foi possível validar",
      detail: (e as Error).message,
    };
  }
}

/* Feedback helpers */

export function playFeedbackTone(kind: "success" | "error" | "warn") {
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.08;
    if (kind === "success") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1320, ctx.currentTime + 0.12);
    } else if (kind === "warn") {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
    }
    osc.start();
    osc.stop(ctx.currentTime + (kind === "success" ? 0.18 : 0.32));
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch {
    // ignore
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    (navigator as unknown as { vibrate?: (p: number | number[]) => boolean }).vibrate?.(pattern);
  } catch {
    // ignore
  }
}

export function feedbackFor(status: ValidationStatus) {
  if (status === "allowed") {
    playFeedbackTone("success");
    vibrate(80);
  } else if (status === "network_error") {
    playFeedbackTone("warn");
    vibrate([60, 60, 60]);
  } else {
    playFeedbackTone("error");
    vibrate([120, 80, 120]);
  }
}
