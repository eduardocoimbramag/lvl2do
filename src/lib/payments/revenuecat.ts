/**
 * Placeholders da integração de pagamento (RevenueCat).
 *
 * ⚠️ NADA de SDK/checkout/webhook real nesta etapa. Estas funções existem para
 * que a UI (paywall) já chame a "forma" final da API sem quebrar o app. A
 * integração real será plugada aqui depois, mantendo as mesmas assinaturas.
 */

import { PRO_ENTITLEMENT } from "@/data/subscription";

/** Resultado de uma tentativa de checkout (formato estável para a UI). */
export interface CheckoutResult {
  /** true se o checkout foi concluído com assinatura ativa. */
  ok: boolean;
  /** motivo/estado (ex.: "not-implemented", "cancelled", "purchased"). */
  status: "not-implemented" | "cancelled" | "purchased" | "error";
  /** mensagem amigável opcional. */
  message?: string;
}

/** Estado de entitlement retornado pelo provedor (formato estável). */
export interface EntitlementState {
  /** o usuário tem o entitlement PRO ativo? */
  active: boolean;
  /** entitlement consultado. */
  entitlement: string;
  /** validade (ISO), se conhecida. */
  expiresAt?: string | null;
}

/**
 * Inicia o fluxo de assinatura (checkout).
 *
 * TODO(RevenueCat): substituir por Purchases.purchasePackage(...) (web billing /
 * app store), tratar sucesso/cancelamento e sincronizar o entitlement no banco
 * (via webhook). Por enquanto, não faz cobrança — retorna estado controlado.
 */
export async function startRevenueCatCheckout(): Promise<CheckoutResult> {
  // Sem SDK ainda — não lançamos erro para não quebrar a UI; sinalizamos o
  // estado "não implementado" para o chamador tratar (ex.: mostrar aviso).
  return {
    ok: false,
    status: "not-implemented",
    message: "Pagamento ainda não está disponível (integração RevenueCat pendente).",
  };
}

/**
 * Consulta/atualiza o entitlement atual do usuário no provedor.
 *
 * TODO(RevenueCat): substituir por Purchases.getCustomerInfo(...) e mapear
 * `entitlements.active[PRO_ENTITLEMENT]`. Por enquanto retorna sempre inativo.
 */
export async function refreshRevenueCatEntitlement(): Promise<EntitlementState> {
  return {
    active: false,
    entitlement: PRO_ENTITLEMENT,
    expiresAt: null,
  };
}
