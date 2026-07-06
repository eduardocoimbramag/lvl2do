"use client";

/**
 * Integração de pagamento — RevenueCat (Web Billing, `@revenuecat/purchases-js`).
 *
 * DEFENSIVO: só ativa se `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY` estiver definida.
 * Sem a key (ex.: ambiente ainda sem billing configurado), as funções retornam
 * um estado controlado ("not-implemented"/inativo) SEM quebrar o app — igual ao
 * comportamento do placeholder anterior. A fonte de verdade do ACESSO é o
 * `profiles` (atualizado pelo webhook); estas funções servem para iniciar a
 * compra e consultar o entitlement no cliente.
 */

import { PRO_ENTITLEMENT } from "@/data/subscription";

/**
 * Carrega o SDK do RevenueCat sob demanda (import dinâmico) para NÃO inflar o
 * bundle inicial de quem não usa pagamento. Só é chamado quando há key + window.
 */
async function loadPurchases() {
  const mod = await import("@revenuecat/purchases-js");
  return mod.Purchases;
}

/** Resultado de uma tentativa de checkout (formato estável para a UI). */
export interface CheckoutResult {
  ok: boolean;
  status: "not-implemented" | "cancelled" | "purchased" | "error";
  message?: string;
}

/** Estado de entitlement retornado pelo provedor (formato estável). */
export interface EntitlementState {
  active: boolean;
  entitlement: string;
  expiresAt?: string | null;
}

/** Chave pública do Web Billing (definida no .env.local quando disponível). */
const WEB_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY;

/** RevenueCat está habilitado neste ambiente? (só no cliente + com key). */
export function isRevenueCatEnabled(): boolean {
  return typeof window !== "undefined" && !!WEB_API_KEY;
}

/**
 * Configura o SDK uma vez, associando o usuário Supabase (`appUserId = auth.uid`).
 * Idempotente e seguro: no-op se não houver key ou já estiver configurado.
 * Deve ser chamado assim que o usuário autenticado estiver disponível.
 */
export async function ensureConfigured(appUserId: string): Promise<boolean> {
  if (!isRevenueCatEnabled() || !appUserId) return false;
  try {
    const Purchases = await loadPurchases();
    if (!Purchases.isConfigured()) {
      Purchases.configure({ apiKey: WEB_API_KEY!, appUserId });
    }
    return true;
  } catch (e) {
    console.error("[revenuecat] configure falhou:", e);
    return false;
  }
}

/**
 * Inicia o fluxo de assinatura (checkout). Requer o SDK configurado.
 * TODO(prod): garantir que a Offering "current" tenha o package mensal do PRO
 * (14 dias de trial) no dashboard do RevenueCat.
 */
export async function startRevenueCatCheckout(): Promise<CheckoutResult> {
  if (!isRevenueCatEnabled()) {
    return {
      ok: false,
      status: "not-implemented",
      message: "Pagamento ainda não está disponível (RevenueCat não configurado).",
    };
  }
  try {
    const Purchases = await loadPurchases();
    const rc = Purchases.getSharedInstance();
    const offerings = await rc.getOfferings();
    const pkg = offerings.current?.availablePackages?.[0];
    if (!pkg) {
      return { ok: false, status: "error", message: "Nenhum plano disponível no momento." };
    }

    const { customerInfo } = await rc.purchase({ rcPackage: pkg });
    const active = !!customerInfo.entitlements.active[PRO_ENTITLEMENT];
    return active
      ? { ok: true, status: "purchased" }
      : { ok: false, status: "error", message: "A compra não ativou o acesso Pro." };
  } catch (e: unknown) {
    // usuário cancelou vs erro real (o SDK expõe um código de erro)
    const err = e as { errorCode?: unknown; message?: string; userCancelled?: boolean };
    const cancelled =
      err?.userCancelled === true ||
      String(err?.message ?? "").toLowerCase().includes("cancel");
    if (!cancelled) console.error("[revenuecat] checkout falhou:", e);
    return { ok: false, status: cancelled ? "cancelled" : "error" };
  }
}

/**
 * Consulta o entitlement PRO atual do usuário no provedor.
 * Retorna inativo (sem erro) quando o SDK não está configurado.
 */
export async function refreshRevenueCatEntitlement(): Promise<EntitlementState> {
  if (!isRevenueCatEnabled()) {
    return { active: false, entitlement: PRO_ENTITLEMENT, expiresAt: null };
  }
  try {
    const Purchases = await loadPurchases();
    const info = await Purchases.getSharedInstance().getCustomerInfo();
    const ent = info.entitlements.active[PRO_ENTITLEMENT];
    return {
      active: !!ent,
      entitlement: PRO_ENTITLEMENT,
      expiresAt: ent?.expirationDate ? ent.expirationDate.toISOString() : null,
    };
  } catch (e) {
    console.error("[revenuecat] getCustomerInfo falhou:", e);
    return { active: false, entitlement: PRO_ENTITLEMENT, expiresAt: null };
  }
}
