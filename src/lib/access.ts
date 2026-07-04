import type { Database } from "@/integrations/supabase/types";

export type InviteType = Database["public"]["Enums"]["invite_type"];
export type InviteStatus = Database["public"]["Enums"]["invite_status"];
export type CredentialRoleType =
  Database["public"]["Enums"]["credential_role_type"];
export type CredentialStatus = Database["public"]["Enums"]["credential_status"];
export type AccessRuleTarget =
  Database["public"]["Enums"]["access_rule_target"];
export type AccessRuleType = Database["public"]["Enums"]["access_rule_type"];

export const INVITE_TYPES: readonly InviteType[] = [
  "guest",
  "influencer",
  "sponsor",
  "press",
  "partner",
  "artist",
  "production",
] as const;
export const INVITE_TYPE_LABEL: Record<InviteType, string> = {
  guest: "Convidado",
  influencer: "Influenciador",
  sponsor: "Patrocinador",
  press: "Imprensa",
  partner: "Parceiro",
  artist: "Artista",
  production: "Produção",
};

export const INVITE_STATUSES: readonly InviteStatus[] = [
  "active",
  "revoked",
  "used",
  "expired",
] as const;
export const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
  active: "Ativo",
  revoked: "Revogado",
  used: "Utilizado",
  expired: "Expirado",
};

export const CREDENTIAL_ROLE_TYPES: readonly CredentialRoleType[] = [
  "staff",
  "security",
  "production",
  "artist",
  "supplier",
  "press",
] as const;
export const CREDENTIAL_ROLE_LABEL: Record<CredentialRoleType, string> = {
  staff: "Staff",
  security: "Segurança",
  production: "Produção",
  artist: "Artista",
  supplier: "Fornecedor",
  press: "Imprensa",
};

export const CREDENTIAL_STATUSES: readonly CredentialStatus[] = [
  "active",
  "inactive",
] as const;
export const CREDENTIAL_STATUS_LABEL: Record<CredentialStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

export const ACCESS_RULE_TARGETS: readonly AccessRuleTarget[] = [
  "invite",
  "credential",
  "sector",
  "space",
] as const;
export const ACCESS_RULE_TARGET_LABEL: Record<AccessRuleTarget, string> = {
  invite: "Convite",
  credential: "Credencial",
  sector: "Setor",
  space: "Espaço",
};

export const ACCESS_RULE_TYPES: readonly AccessRuleType[] = [
  "allow",
  "deny",
] as const;
export const ACCESS_RULE_TYPE_LABEL: Record<AccessRuleType, string> = {
  allow: "Permitir",
  deny: "Negar",
};
