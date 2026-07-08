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

import {
  PRO_ENTITLEMENT,
  RC_MONTHLY_PACKAGE_ID,
  RC_MONTHLY_PRODUCT_ID,
} from "@/data/subscription";
import type { Package } from "@revenuecat/purchases-js";

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
  status: "not-implemented" | "cancelled" | "purchased" | "already-active" | "error";
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
 * Encontra o package MENSAL na offering `current`, tolerante ao id exibido no
 * dashboard: usa o atalho `.monthly`; senão procura por `identifier` do package
 * ($rc_monthly) OU pelo `identifier` do produto (lvl2do_pro_monthly).
 */
function findMonthlyPackage(packages: Package[], monthlyShortcut: Package | null): Package | null {
  if (monthlyShortcut) return monthlyShortcut;
  return (
    packages.find((p) => p.identifier === RC_MONTHLY_PACKAGE_ID) ??
    packages.find(
      (p) =>
        p.webBillingProduct?.identifier === RC_MONTHLY_PRODUCT_ID ||
        p.rcBillingProduct?.identifier === RC_MONTHLY_PRODUCT_ID,
    ) ??
    null
  );
}

/**
 * Inicia o fluxo de assinatura (checkout) do plano mensal PRO no RevenueCat.
 * Retorna sempre um `message` específico (nunca cai em erro genérico silencioso).
 */
export async function startRevenueCatCheckout(): Promise<CheckoutResult> {
  // 1) API key ausente no build
  if (!WEB_API_KEY) {
    const message = "RevenueCat Web API Key não encontrada no build.";
    console.error("[revenuecat]", message);
    return { ok: false, status: "not-implemented", message };
  }
  if (typeof window === "undefined") {
    return { ok: false, status: "error", message: "Checkout só disponível no navegador." };
  }

  try {
    const Purchases = await loadPurchases();
    if (!Purchases.isConfigured()) {
      const message = "RevenueCat não está configurado (usuário não identificado).";
      console.error("[revenuecat]", message);
      return { ok: false, status: "error", message };
    }
    const rc = Purchases.getSharedInstance();

    // 1.5) JÁ tem Pro ativo? Nunca tenta comprar de novo — sinaliza já-ativo.
    const info0 = await rc.getCustomerInfo();
    if (info0.entitlements.active[PRO_ENTITLEMENT]) {
      return {
        ok: true,
        status: "already-active",
        message: "Sua assinatura já está ativa. Redirecionando...",
      };
    }

    // 2) offering current
    const offerings = await rc.getOfferings();
    const current = offerings.current;
    if (!current) {
      const message = "Offering current não encontrada no RevenueCat.";
      console.error("[revenuecat]", message, { offerings });
      return { ok: false, status: "error", message };
    }

    // 3) package mensal ($rc_monthly / lvl2do_pro_monthly)
    const pkg = findMonthlyPackage(current.availablePackages, current.monthly);
    if (!pkg) {
      const message = `Package mensal ${RC_MONTHLY_PACKAGE_ID}/${RC_MONTHLY_PRODUCT_ID} não encontrado.`;
      console.error("[revenuecat]", message, {
        available: current.availablePackages.map((p) => ({
          package: p.identifier,
          product: p.webBillingProduct?.identifier,
        })),
      });
      return { ok: false, status: "error", message };
    }

    // 4) compra
    const { customerInfo } = await rc.purchase({ rcPackage: pkg });
    const active = !!customerInfo.entitlements.active[PRO_ENTITLEMENT];
    if (!active) {
      const message = "A compra foi concluída, mas o acesso Pro ainda não foi ativado. Tente atualizar em instantes.";
      console.error("[revenuecat]", message, { entitlements: customerInfo.entitlements.active });
      return { ok: false, status: "error", message };
    }
    return { ok: true, status: "purchased" };
  } catch (e: unknown) {
    const err = e as { errorCode?: number; name?: string; message?: string };
    const rawMsg = String(err?.message ?? "").toLowerCase();

    // produto JÁ ativo para o usuário → não é falha; trata como já-ativo.
    if (rawMsg.includes("already active") || rawMsg.includes("already purchased")) {
      console.warn("[revenuecat] produto já ativo para o usuário — tratando como já-ativo.");
      return {
        ok: true,
        status: "already-active",
        message: "Sua assinatura já está ativa. Redirecionando...",
      };
    }

    // cancelamento do usuário (PurchasesError com ErrorCode.UserCancelledError = 1)
    const cancelled =
      err?.errorCode === 1 || err?.name === "UserCancelledError" || rawMsg.includes("cancel");
    if (cancelled) {
      console.warn("[revenuecat] compra cancelada pelo usuário.");
      return { ok: false, status: "cancelled", message: "Compra cancelada." };
    }

    const message = err?.message
      ? `Falha no checkout: ${err.message}`
      : "Não foi possível iniciar o checkout. Tente novamente.";
    console.error("[revenuecat] checkout falhou:", e);
    return { ok: false, status: "error", message };
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
