import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { classifyCallbackError, type CallbackErrorKey } from "@/lib/auth/authErrors";
import { RECOVERY_COOKIE, recoveryCookieOptions } from "@/lib/auth/recovery";

/**
 * Callback de autenticação: confirmação de e-mail, OAuth e RECUPERAÇÃO DE SENHA.
 *
 * Aceita as duas formas de link que o Supabase pode enviar:
 *
 *  1. `?code=...`        → fluxo PKCE (padrão do @supabase/ssr). Exige que o
 *                          link seja aberto no MESMO navegador que pediu, pois
 *                          o "code verifier" mora num cookie local.
 *  2. `?token_hash=&type=` → fluxo OTP. Funciona em QUALQUER navegador/aparelho
 *                          (usuário pede no desktop e abre no celular). Requer
 *                          o template de e-mail usando {{ .TokenHash }} —
 *                          ver docs/recuperacao-senha.md.
 *
 * Também trata os parâmetros de erro que o próprio Supabase devolve quando o
 * link já expirou (`?error=access_denied&error_code=otp_expired`).
 *
 * Configure no Supabase: Redirect URL = {SITE_URL}/auth/callback
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const flow = searchParams.get("flow");

  // `recovery` precisa ser detectável nos DOIS fluxos: no OTP vem em `type`,
  // no PKCE o `type` não volta, então marcamos com `flow=recovery` na origem.
  const isRecovery = flow === "recovery" || type === "recovery";
  const next = safeNext(searchParams.get("next"), isRecovery);

  // 1) O Supabase já rejeitou o link (expirado/usado) antes de chegar aqui.
  const supabaseError = searchParams.get("error") ?? searchParams.get("error_code");
  if (supabaseError) {
    const key: CallbackErrorKey =
      supabaseError.includes("expired") || searchParams.get("error_code")?.includes("expired")
        ? "expired_link"
        : "invalid_link";
    return failure(origin, isRecovery, key);
  }

  const supabase = await createClient();

  // 2) Fluxo OTP (token_hash) — preferido, funciona entre dispositivos.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return failure(origin, isRecovery, classifyCallbackError(error));
    return success(origin, next, isRecovery);
  }

  // 3) Fluxo PKCE (code).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure(origin, isRecovery, classifyCallbackError(error));
    return success(origin, next, isRecovery);
  }

  // 4) Sem credencial nenhuma na URL.
  return failure(origin, isRecovery, "invalid_link");
}

/**
 * Redireciona para o destino e, quando o link era de recuperação, emite o
 * cookie httpOnly que autoriza /reset-password. Sem ele, nem o middleware nem
 * a rota de troca aceitam alterar a senha — impede que uma sessão comum
 * (ex.: aba esquecida aberta) troque a senha sem conhecer a atual.
 */
function success(origin: string, next: string, isRecovery: boolean) {
  const response = NextResponse.redirect(`${origin}${next}`);
  if (isRecovery) {
    response.cookies.set(RECOVERY_COOKIE, "1", recoveryCookieOptions());
  }
  return response;
}

/** Falha volta para a tela mais útil ao usuário, com o motivo explicado. */
function failure(origin: string, isRecovery: boolean, error: CallbackErrorKey) {
  const path = isRecovery ? "/forgot-password" : "/login";
  return NextResponse.redirect(`${origin}${path}?error=${error}`);
}

/**
 * Só aceita caminhos internos — bloqueia open redirect via `?next=//evil.com`
 * ou `?next=https://evil.com`.
 */
function safeNext(next: string | null, isRecovery: boolean): string {
  const fallback = isRecovery ? "/reset-password" : "/onboarding";
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
