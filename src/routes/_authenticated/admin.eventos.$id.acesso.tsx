import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Plus, Save, ShieldCheck, Ticket, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrgMembership } from "@/hooks/use-org-membership";
import { OperationsNav } from "@/components/admin/OperationsNav";
import {
  ACCESS_RULE_TARGETS,
  ACCESS_RULE_TARGET_LABEL,
  ACCESS_RULE_TYPES,
  ACCESS_RULE_TYPE_LABEL,
  CREDENTIAL_ROLE_LABEL,
  CREDENTIAL_ROLE_TYPES,
  CREDENTIAL_STATUSES,
  CREDENTIAL_STATUS_LABEL,
  INVITE_STATUSES,
  INVITE_STATUS_LABEL,
  INVITE_TYPES,
  INVITE_TYPE_LABEL,
  type AccessRuleTarget,
  type AccessRuleType,
  type CredentialRoleType,
  type CredentialStatus,
  type InviteStatus,
  type InviteType,
} from "@/lib/access";
import type { Database } from "@/integrations/supabase/types";

type Invite = Database["public"]["Tables"]["event_invites"]["Row"];
type Credential = Database["public"]["Tables"]["event_credentials"]["Row"];
type Rule = Database["public"]["Tables"]["event_access_rules"]["Row"];

type Tab = "invites" | "credentials" | "rules";

export const Route = createFileRoute("/_authenticated/admin/eventos/$id/acesso")({
  head: () => ({
    meta: [
      { title: "Acesso — Operação · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccessPage,
});

async function audit(
  organizationId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return;
  await supabase.rpc("record_audit_event", {
    _organization_id: organizationId,
    _actor_user_id: userRes.user.id,
    _action: action,
    _entity_type: entityType,
    _entity_id: entityId,
    _metadata: metadata as never,
  });
}

function AccessPage() {
  const { id: eventId } = Route.useParams();
  const [tab, setTab] = useState<Tab>("invites");

  const eventQuery = useQuery({
    queryKey: ["admin", "event", eventId, "meta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, organization_id")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const orgId = eventQuery.data?.organization_id;

  return (
    <div className="p-5 md:p-8">
      <OperationsNav
        eventId={eventId}
        active="access"
        eventTitle={eventQuery.data?.title}
      />

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border">
        {(
          [
            { key: "invites", label: "Convites", icon: <Ticket className="h-3.5 w-3.5" /> },
            { key: "credentials", label: "Credenciais", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
            { key: "rules", label: "Regras", icon: <KeyRound className="h-3.5 w-3.5" /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors ${
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {!orgId ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tab === "invites" ? (
        <InvitesPanel eventId={eventId} organizationId={orgId} />
      ) : tab === "credentials" ? (
        <CredentialsPanel eventId={eventId} organizationId={orgId} />
      ) : (
        <RulesPanel eventId={eventId} organizationId={orgId} />
      )}
    </div>
  );
}

/* ============ INVITES ============ */
function InvitesPanel({
  eventId,
  organizationId,
}: {
  eventId: string;
  organizationId: string;
}) {
  const qc = useQueryClient();
  const { data: membership } = useOrgMembership();
  const [editing, setEditing] = useState<Invite | "new" | null>(null);

  const canManage = membership
    ? ["owner", "admin", "manager"].includes(membership.role)
    : false;

  const q = useQuery({
    queryKey: ["admin", "event", eventId, "invites"],
    queryFn: async (): Promise<Invite[]> => {
      const { data, error } = await supabase
        .from("event_invites")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function revoke(inv: Invite) {
    if (!canManage) return;
    if (!confirm(`Revogar convite de ${inv.name}?`)) return;
    const { error } = await supabase
      .from("event_invites")
      .update({ status: "revoked" })
      .eq("id", inv.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await audit(organizationId, "invite.revoked", "event_invite", inv.id, {
      from: inv.status,
    });
    toast.success("Convite revogado.");
    qc.invalidateQueries({ queryKey: ["admin", "event", eventId, "invites"] });
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Convites operacionais. Não expostos publicamente.
        </p>
        {canManage && editing === null && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo convite
          </button>
        )}
      </div>

      {editing !== null && canManage && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-5">
          <InviteForm
            eventId={eventId}
            organizationId={organizationId}
            initial={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              qc.invalidateQueries({
                queryKey: ["admin", "event", eventId, "invites"],
              });
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="mt-5">
        {q.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : q.data && q.data.length > 0 ? (
          <ul className="grid gap-3">
            {q.data.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{inv.name}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {INVITE_TYPE_LABEL[inv.type]}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {INVITE_STATUS_LABEL[inv.status]}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {[inv.email, inv.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {canManage && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(inv)}
                      className="rounded-md border border-border-strong px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      Editar
                    </button>
                    {inv.status !== "revoked" && (
                      <button
                        type="button"
                        onClick={() => revoke(inv)}
                        className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Revogar
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border-strong bg-surface/40 p-8 text-center text-sm text-muted-foreground">
            Nenhum convite cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}

function InviteForm({
  eventId,
  organizationId,
  initial,
  onDone,
  onCancel,
}: {
  eventId: string;
  organizationId: string;
  initial: Invite | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<InviteType>(initial?.type ?? "guest");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [status, setStatus] = useState<InviteStatus>(initial?.status ?? "active");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const nm = name.trim();
    if (nm.length < 1 || nm.length > 160) {
      toast.error("Nome inválido.");
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("E-mail inválido.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        event_id: eventId,
        organization_id: organizationId,
        name: nm,
        type,
        email: email.trim() || null,
        phone: phone.trim() || null,
        status,
      };
      if (isEdit) {
        const { error } = await supabase
          .from("event_invites")
          .update(payload)
          .eq("id", initial!.id);
        if (error) throw error;
        await audit(organizationId, "invite.updated", "event_invite", initial!.id, {
          name: nm,
          type,
          status,
        });
        toast.success("Convite atualizado.");
      } else {
        const { data, error } = await supabase
          .from("event_invites")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        await audit(organizationId, "invite.created", "event_invite", data.id, {
          name: nm,
          type,
          status,
        });
        toast.success("Convite criado.");
      }
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          {isEdit ? "Editar convite" : "Novo convite"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-strong hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Nome</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input mt-2" maxLength={160} />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tipo</span>
          <select value={type} onChange={(e) => setType(e.target.value as InviteType)} className="input mt-2">
            {INVITE_TYPES.map((t) => (
              <option key={t} value={t}>{INVITE_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as InviteStatus)} className="input mt-2">
            {INVITE_STATUSES.map((s) => (
              <option key={s} value={s}>{INVITE_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">E-mail (opcional)</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-2" type="email" maxLength={200} />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Telefone (opcional)</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input mt-2" maxLength={40} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border-strong px-4 py-2 text-sm hover:bg-accent">
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ============ CREDENTIALS ============ */
function CredentialsPanel({
  eventId,
  organizationId,
}: {
  eventId: string;
  organizationId: string;
}) {
  const qc = useQueryClient();
  const { data: membership } = useOrgMembership();
  const [editing, setEditing] = useState<Credential | "new" | null>(null);

  const canManage = membership
    ? ["owner", "admin", "manager"].includes(membership.role)
    : false;

  const q = useQuery({
    queryKey: ["admin", "event", eventId, "credentials"],
    queryFn: async (): Promise<Credential[]> => {
      const { data, error } = await supabase
        .from("event_credentials")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function deactivate(c: Credential) {
    if (!canManage) return;
    const { error } = await supabase
      .from("event_credentials")
      .update({ status: "inactive" })
      .eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await audit(organizationId, "credential.deactivated", "event_credential", c.id, {
      from: c.status,
    });
    toast.success("Credencial desativada.");
    qc.invalidateQueries({ queryKey: ["admin", "event", eventId, "credentials"] });
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Credenciais operacionais (staff, produção, imprensa). Sem acesso automático de entrada.
        </p>
        {canManage && editing === null && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nova credencial
          </button>
        )}
      </div>

      {editing !== null && canManage && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-5">
          <CredentialForm
            eventId={eventId}
            organizationId={organizationId}
            initial={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              qc.invalidateQueries({
                queryKey: ["admin", "event", eventId, "credentials"],
              });
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="mt-5">
        {q.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : q.data && q.data.length > 0 ? (
          <ul className="grid gap-3">
            {q.data.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.holder_name}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {CREDENTIAL_ROLE_LABEL[c.role_type]}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {CREDENTIAL_STATUS_LABEL[c.status]}
                    </span>
                  </div>
                  {c.document_id && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      Doc.: {c.document_id}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      className="rounded-md border border-border-strong px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      Editar
                    </button>
                    {c.status === "active" && (
                      <button
                        type="button"
                        onClick={() => deactivate(c)}
                        className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Desativar
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border-strong bg-surface/40 p-8 text-center text-sm text-muted-foreground">
            Nenhuma credencial cadastrada ainda.
          </p>
        )}
      </div>
    </div>
  );
}

function CredentialForm({
  eventId,
  organizationId,
  initial,
  onDone,
  onCancel,
}: {
  eventId: string;
  organizationId: string;
  initial: Credential | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const [holder, setHolder] = useState(initial?.holder_name ?? "");
  const [roleType, setRoleType] = useState<CredentialRoleType>(
    initial?.role_type ?? "staff",
  );
  const [documentId, setDocumentId] = useState(initial?.document_id ?? "");
  const [status, setStatus] = useState<CredentialStatus>(
    initial?.status ?? "active",
  );
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const h = holder.trim();
    if (h.length < 1 || h.length > 160) {
      toast.error("Nome do portador inválido.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        event_id: eventId,
        organization_id: organizationId,
        holder_name: h,
        role_type: roleType,
        document_id: documentId.trim() || null,
        status,
      };
      if (isEdit) {
        const { error } = await supabase
          .from("event_credentials")
          .update(payload)
          .eq("id", initial!.id);
        if (error) throw error;
        await audit(organizationId, "credential.updated", "event_credential", initial!.id, {
          holder_name: h,
          role_type: roleType,
          status,
        });
        toast.success("Credencial atualizada.");
      } else {
        const { data, error } = await supabase
          .from("event_credentials")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        await audit(organizationId, "credential.created", "event_credential", data.id, {
          holder_name: h,
          role_type: roleType,
          status,
        });
        toast.success("Credencial criada.");
      }
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          {isEdit ? "Editar credencial" : "Nova credencial"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-strong hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Nome do portador</span>
        <input value={holder} onChange={(e) => setHolder(e.target.value)} className="input mt-2" maxLength={160} />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Função</span>
          <select value={roleType} onChange={(e) => setRoleType(e.target.value as CredentialRoleType)} className="input mt-2">
            {CREDENTIAL_ROLE_TYPES.map((r) => (
              <option key={r} value={r}>{CREDENTIAL_ROLE_LABEL[r]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as CredentialStatus)} className="input mt-2">
            {CREDENTIAL_STATUSES.map((s) => (
              <option key={s} value={s}>{CREDENTIAL_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Documento (opcional)</span>
        <input value={documentId} onChange={(e) => setDocumentId(e.target.value)} className="input mt-2" maxLength={80} />
      </label>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border-strong px-4 py-2 text-sm hover:bg-accent">
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ============ RULES ============ */
function RulesPanel({
  eventId,
  organizationId,
}: {
  eventId: string;
  organizationId: string;
}) {
  const qc = useQueryClient();
  const { data: membership } = useOrgMembership();
  const [editing, setEditing] = useState<Rule | "new" | null>(null);

  const canManage = membership
    ? ["owner", "admin", "manager"].includes(membership.role)
    : false;
  const canDelete = membership
    ? ["owner", "admin"].includes(membership.role)
    : false;

  const q = useQuery({
    queryKey: ["admin", "event", eventId, "rules"],
    queryFn: async (): Promise<Rule[]> => {
      const { data, error } = await supabase
        .from("event_access_rules")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function remove(r: Rule) {
    if (!canDelete) return;
    if (!confirm("Remover esta regra?")) return;
    const { error } = await supabase
      .from("event_access_rules")
      .delete()
      .eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await audit(organizationId, "rule.deleted", "event_access_rule", r.id, {
      target: r.target,
      rule_type: r.rule_type,
    });
    toast.success("Regra removida.");
    qc.invalidateQueries({ queryKey: ["admin", "event", eventId, "rules"] });
  }

  return (
    <div className="mt-5">
      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        Regras de acesso são estruturais nesta fase. A execução do access engine será entregue em fases futuras.
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Defina regras de permissão ou negação por tipo de alvo.
        </p>
        {canManage && editing === null && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nova regra
          </button>
        )}
      </div>

      {editing !== null && canManage && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-5">
          <RuleForm
            eventId={eventId}
            organizationId={organizationId}
            initial={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              qc.invalidateQueries({
                queryKey: ["admin", "event", eventId, "rules"],
              });
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="mt-5">
        {q.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : q.data && q.data.length > 0 ? (
          <ul className="grid gap-3">
            {q.data.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${
                        r.rule_type === "allow"
                          ? "bg-accent/20 text-accent"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {ACCESS_RULE_TYPE_LABEL[r.rule_type]}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {ACCESS_RULE_TARGET_LABEL[r.target]}
                    </span>
                  </div>
                  <pre className="mt-2 max-w-full overflow-x-auto rounded bg-muted/40 p-2 text-[11px] text-muted-foreground">
                    {JSON.stringify(r.conditions, null, 0)}
                  </pre>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      className="rounded-md border border-border-strong px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      Editar
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      aria-label="Remover"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border-strong bg-surface/40 p-8 text-center text-sm text-muted-foreground">
            Nenhuma regra cadastrada ainda.
          </p>
        )}
      </div>
    </div>
  );
}

function RuleForm({
  eventId,
  organizationId,
  initial,
  onDone,
  onCancel,
}: {
  eventId: string;
  organizationId: string;
  initial: Rule | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const [target, setTarget] = useState<AccessRuleTarget>(initial?.target ?? "invite");
  const [ruleType, setRuleType] = useState<AccessRuleType>(
    initial?.rule_type ?? "allow",
  );
  const [conditions, setConditions] = useState<string>(
    JSON.stringify(initial?.conditions ?? {}, null, 2),
  );
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    let cond: unknown;
    try {
      cond = conditions.trim() ? JSON.parse(conditions) : {};
    } catch {
      toast.error("Condições devem ser JSON válido.");
      return;
    }
    if (typeof cond !== "object" || cond === null || Array.isArray(cond)) {
      toast.error("Condições devem ser um objeto JSON.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        event_id: eventId,
        organization_id: organizationId,
        target,
        rule_type: ruleType,
        conditions: cond as Record<string, unknown>,
      };
      if (isEdit) {
        const { error } = await supabase
          .from("event_access_rules")
          .update(payload)
          .eq("id", initial!.id);
        if (error) throw error;
        await audit(organizationId, "rule.updated", "event_access_rule", initial!.id, {
          target,
          rule_type: ruleType,
        });
        toast.success("Regra atualizada.");
      } else {
        const { data, error } = await supabase
          .from("event_access_rules")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        await audit(organizationId, "rule.created", "event_access_rule", data.id, {
          target,
          rule_type: ruleType,
        });
        toast.success("Regra criada.");
      }
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{isEdit ? "Editar regra" : "Nova regra"}</h2>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-strong hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Alvo</span>
          <select value={target} onChange={(e) => setTarget(e.target.value as AccessRuleTarget)} className="input mt-2">
            {ACCESS_RULE_TARGETS.map((t) => (
              <option key={t} value={t}>{ACCESS_RULE_TARGET_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tipo</span>
          <select value={ruleType} onChange={(e) => setRuleType(e.target.value as AccessRuleType)} className="input mt-2">
            {ACCESS_RULE_TYPES.map((t) => (
              <option key={t} value={t}>{ACCESS_RULE_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Condições (JSON — estrutural, sem execução nesta fase)
        </span>
        <textarea
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          rows={5}
          className="input mt-2 font-mono text-xs resize-y"
        />
      </label>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border-strong px-4 py-2 text-sm hover:bg-accent">
          Cancelar
        </button>
      </div>
    </div>
  );
}
