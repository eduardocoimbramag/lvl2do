import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { validatePassword } from "@/lib/auth/password";
import { messageForPasswordUpdateError } from "@/lib/auth/authErrors";
import { RECOVERY_COOKIE } from "@/lib/auth/recovery";

/**
 * Conclui a recuperação de senha.
 *
 * A troca acontece no SERVIDOR de propósito: é o único lugar onde dá para exigir
 * que a sessão tenha nascido de um link de recuperação (cookie httpOnly emitido
 * pelo /auth/callback). Uma sessão comum — como uma aba esquecida logada num
 * computador compartilhado — não passa daqui.
 *
 * Ao final, encerra TODAS as outras sessões do usuário: se a conta estava
 * comprometida, o invasor perde o acesso no mesmo instante.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();

  if (!cookieStore.get(RECOVERY_COOKIE)) {
    return NextResponse.json(
      { error: "Sessão de recuperação inválida ou expirada. Peça um novo link." },
      { status: 403 },
    );
  }

  let password: unknown;
  try {
    password = (await request.json())?.password;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (typeof password !== "string") {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  // A política vale no servidor — o cliente só antecipa o feedback.
  const policyError = validatePassword(password);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Seu link expirou. Peça um novo e-mail de recuperação." },
      { status: 401 },
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return NextResponse.json({ error: messageForPasswordUpdateError(error) }, { status: 400 });
  }

  // Derruba as demais sessões (mantém a atual — scope "others").
  await supabase.auth.signOut({ scope: "others" });

  const response = NextResponse.json({ ok: true });
  // Queima o cookie: o link de recuperação não serve para uma segunda troca.
  response.cookies.set(RECOVERY_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
