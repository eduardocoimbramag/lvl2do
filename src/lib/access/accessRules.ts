/**
 * Regras de acesso ao app (funções PURAS, sem React/efeitos).
 *
 * Centraliza a decisão de "quem pode entrar no app": assinatura ativa/trial,
 * acesso do dia liberado por cristal, ou bypass de desenvolvimento. A camada de
 * estado/UI vive em `useAccessGate`; a integração real de assinatura virá depois
 * (RevenueCat). Todos os campos são OPCIONAIS — o banco ainda não tem as colunas
 * de assinatura, então tudo tem fallback seguro (sem assinatura → sem acesso,
 * exceto cristal do dia ou dev bypass).
 */

import { getLocalDateKey } from "@/lib/xp-system";

/** Motivo pelo qual o acesso foi concedido/negado. */
export type AccessReason =
  | "subscription" // assinatura ativa
  | "trial" // em período de teste
  | "crystal" // cristal já usado hoje libera o dia
  | "dev-bypass" // simulação de desenvolvimento
  | "paywall"; // sem acesso → mostrar paywall

/**
 * Dados (parciais) usados para decidir o acesso. Todos opcionais: campos que
 * ainda não existem no banco simplesmente ficam undefined.
 */
export interface AccessData {
  /** status vindo do provedor/banco (ex.: "active" | "trialing" | "expired"). */
  subscriptionStatus?: string | null;
  /** validade da assinatura/trial (ISO), se houver. */
  subscriptionExpiresAt?: string | null;
  /** plano atual (ex.: "pro"), se houver. */
  plan?: string | null;
  /** saldo de cristais disponíveis. */
  crystals?: number | null;
  /** último dia ("YYYY-MM-DD") em que um cristal liberou acesso. */
  lastCrystalAccessDate?: string | null;
  /** bypass de desenvolvimento (ex.: simulação no localStorage). */
  devBypass?: boolean;
}

/** Status que representam uma assinatura que dá acesso. */
const ACTIVE_STATUSES = new Set(["active", "trialing", "trial", "in_trial", "grace"]);
const TRIAL_STATUSES = new Set(["trialing", "trial", "in_trial"]);

/** A data ISO ainda está no futuro (ou não foi informada = sem expiração)? */
function notExpired(expiresAtISO?: string | null): boolean {
  if (!expiresAtISO) return true; // sem data → não trava por expiração
  const t = new Date(expiresAtISO).getTime();
  if (Number.isNaN(t)) return true; // valor inválido → não trava
  return t > Date.now();
}

/**
 * A assinatura está ativa (inclui trial)? Requer um status "ativo" E não estar
 * expirada. Sem status → false (não assume acesso).
 */
export function isSubscriptionActive(data: AccessData): boolean {
  const status = (data.subscriptionStatus ?? "").toLowerCase();
  if (!ACTIVE_STATUSES.has(status)) return false;
  return notExpired(data.subscriptionExpiresAt);
}

/** A assinatura ativa está em período de TRIAL? */
export function isInTrial(data: AccessData): boolean {
  const status = (data.subscriptionStatus ?? "").toLowerCase();
  return TRIAL_STATUSES.has(status) && notExpired(data.subscriptionExpiresAt);
}

/**
 * O usuário já liberou o acesso de HOJE usando um cristal?
 * Compara `lastCrystalAccessDate` com o dia local de `now`.
 */
export function hasCrystalAccessToday(data: AccessData, now: Date = new Date()): boolean {
  if (!data.lastCrystalAccessDate) return false;
  return data.lastCrystalAccessDate === getLocalDateKey(now);
}

/** Há cristais disponíveis para liberar um dia? */
export function hasCrystalsAvailable(data: AccessData): boolean {
  return (data.crystals ?? 0) > 0;
}

/**
 * Decisão final: o usuário pode acessar o app agora?
 * Ordem: assinatura ativa/trial → cristal do dia → dev bypass → não.
 */
export function canAccessApp(data: AccessData, now: Date = new Date()): boolean {
  return (
    isSubscriptionActive(data) ||
    hasCrystalAccessToday(data, now) ||
    !!data.devBypass
  );
}

/** Motivo do acesso (ou "paywall" se negado), para UI/telemetria. */
export function getAccessReason(data: AccessData, now: Date = new Date()): AccessReason {
  if (isSubscriptionActive(data)) return isInTrial(data) ? "trial" : "subscription";
  if (hasCrystalAccessToday(data, now)) return "crystal";
  if (data.devBypass) return "dev-bypass";
  return "paywall";
}
