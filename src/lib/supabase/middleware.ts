import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessApp } from "@/lib/access/accessRules";
import { RECOVERY_COOKIE } from "@/lib/auth/recovery";

/** Rotas públicas (sem necessidade de login). */
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/auth",
  "/forgot-password",
  "/reset-password",
];

/**
 * Endpoints de webhook (ex.: RevenueCat). Não têm sessão de usuário e se
 * protegem por header (Authorization). Nunca devem redirecionar para /login.
 */
function isWebhook(pathname: string): boolean {
  return pathname.startsWith("/api/webhooks/");
}

/**
 * Prefixos do app interno que exigem ACESSO (assinatura/cristal). Ficam de fora
 * `/onboarding` e `/paywall` (etapas anteriores ao acesso) para evitar loops.
 */
const ACCESS_PREFIXES = [
  "/dashboard",
  "/missions",
  "/alarms",
  "/focus",
  "/progress",
  "/friends",
  "/ranking",
  "/store",
  "/profile",
  "/support",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function needsAccess(pathname: string): boolean {
  return ACCESS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Atualiza a sessão do Supabase a cada request e protege as rotas internas.
 * Quem não está logado e tenta acessar rota protegida é mandado para /login.
 */
export async function updateSession(request: NextRequest) {
  // Defesa em profundidade: webhooks passam direto (sem auth/redirect). Mesmo
  // que o matcher já os exclua, garantimos aqui que nunca vão para /login.
  if (isWebhook(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: não rode lógica entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // /reset-password só existe para quem chegou por um link de recuperação
  // válido (cookie httpOnly emitido pelo /auth/callback). Sem ele, uma sessão
  // comum poderia trocar a senha sem conhecer a atual — ex.: aba esquecida
  // aberta num computador compartilhado. A rota de escrita repete a checagem.
  if (pathname === "/reset-password" && !request.cookies.get(RECOVERY_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/forgot-password";
    url.search = "";
    url.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(url);
  }

  if (!user && !isPublic(pathname)) {
    // Rotas de API respondem 401 em JSON — nunca redirecionam para o HTML do
    // login. Um fetch() segue o redirect por padrão e receberia 200 com a
    // página de login, fazendo o cliente achar que a operação deu certo.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Guard de ACESSO (defesa em profundidade): além do login, as rotas do app
  // interno exigem assinatura ativa / cristal do dia. Reusa as MESMAS regras
  // puras do cliente (canAccessApp). Sem acesso → /paywall?next=<rota>.
  //
  // ⚠️ DESLIGADO por padrão: só entra em ação com ENABLE_SERVER_ACCESS_GUARD="true".
  // Motivo: enquanto o RevenueCat/assinatura real não existe, ninguém tem status
  // de assinatura no banco — ligar isto bloquearia TODOS no servidor (e o bypass
  // de dev é client-side, invisível ao middleware). Ligue APENAS quando o
  // pagamento real estiver ativo (ver docs/paymentsystem.md e docs/restante.md).
  const serverGuardOn = process.env.ENABLE_SERVER_ACCESS_GUARD === "true";
  if (serverGuardOn && user && needsAccess(pathname)) {
    const { data: p } = await supabase
      .from("profiles")
      .select("subscription_status, subscription_expires_at, plan, crystals, last_crystal_access_date")
      .eq("id", user.id)
      .single();

    const hasAccess = canAccessApp({
      subscriptionStatus: p?.subscription_status ?? null,
      subscriptionExpiresAt: p?.subscription_expires_at ?? null,
      plan: p?.plan ?? null,
      crystals: p?.crystals ?? 0,
      lastCrystalAccessDate: p?.last_crystal_access_date ?? null,
    });

    if (!hasAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/paywall";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
