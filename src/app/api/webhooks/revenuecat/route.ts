import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Webhook do RevenueCat — FONTE DE VERDADE do status de assinatura.
 *
 * Recebe eventos do RevenueCat e atualiza `profiles.subscription_*` no Supabase
 * usando a SERVICE ROLE KEY (server-only, ignora RLS). O AccessGuard/middleware
 * leem esses campos para liberar o app.
 *
 * Config no RevenueCat Dashboard → Integrations → Webhooks:
 *   URL: https://SEU_DOMINIO/api/webhooks/revenuecat
 *   Authorization header: Bearer <REVENUECAT_WEBHOOK_SECRET>
 *
 * Requer no ambiente (server-only):
 *   SUPABASE_SERVICE_ROLE_KEY, REVENUECAT_WEBHOOK_SECRET
 * (e o já existente NEXT_PUBLIC_SUPABASE_URL).
 */

export const runtime = "nodejs"; // precisa da service role key — não Edge
export const dynamic = "force-dynamic";

/** Tipos ativos → acesso liberado. */
const ACTIVATING = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
]);

interface RcEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  period_type?: string; // "TRIAL" | "NORMAL" | "INTRO"
  expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
}

export async function POST(req: Request) {
  // 1) autenticação do webhook (header configurado no RevenueCat)
  const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2) service role key obrigatória (server-only)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    console.error("[rc-webhook] SUPABASE_SERVICE_ROLE_KEY/URL ausentes.");
    return NextResponse.json({ error: "server not configured" }, { status: 500 });
  }

  let event: RcEvent | undefined;
  try {
    const body = (await req.json()) as { event?: RcEvent };
    event = body?.event;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!event?.type) return NextResponse.json({ ok: true }); // nada a fazer

  // 3) identifica o usuário: app_user_id == auth.uid() do Supabase
  const appUserId = event.app_user_id ?? event.original_app_user_id;
  if (!appUserId) return NextResponse.json({ ok: true });

  // 4) mapeia o evento → status de assinatura
  //    IMPORTANTE: CANCELLATION NÃO rebaixa o acesso — a assinatura segue válida
  //    até EXPIRATION (o RevenueCat emite esse evento no fim real). Assim o
  //    usuário que cancelou continua com acesso até a data que já pagou.
  const type = event.type;
  let status: string | null = null;
  if (ACTIVATING.has(type)) {
    status = event.period_type === "TRIAL" ? "trialing" : "active";
  } else if (type === "EXPIRATION" || type === "SUBSCRIPTION_PAUSED") {
    status = "expired";
  } else if (type === "BILLING_ISSUE") {
    status = "grace"; // período de tolerância (regras tratam como ativo)
  }
  if (!status) return NextResponse.json({ ok: true }); // evento não relevante (ex.: CANCELLATION)

  const expiresAtISO = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;

  // 5) grava no profiles (fonte de verdade). Casa por id == app_user_id.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin
    .from("profiles")
    .update({
      plan: "pro",
      subscription_status: status,
      subscription_expires_at: expiresAtISO,
    })
    .eq("id", appUserId);

  if (error) {
    console.error("[rc-webhook] update profiles falhou:", error);
    // 500 faz o RevenueCat reenviar o evento (retry) — desejável.
    return NextResponse.json({ error: "db update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
