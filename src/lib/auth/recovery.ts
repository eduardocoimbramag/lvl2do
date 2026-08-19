import type { CookieOptions } from "@supabase/ssr";

/**
 * Marcador de "sessão vinda de link de recuperação de senha".
 *
 * Por quê: após validar o link do e-mail, o Supabase cria uma sessão REAL. Sem
 * um marcador, qualquer sessão comum (ex.: aba já logada num PC compartilhado)
 * conseguiria abrir /reset-password e trocar a senha sem saber a senha atual.
 *
 * O cookie é httpOnly (invisível ao JS da página) e só é emitido pelo
 * /auth/callback quando o link realmente é do tipo `recovery`. Tanto o
 * middleware (navegação) quanto a rota de troca (escrita) exigem sua presença.
 */
export const RECOVERY_COOKIE = "l2d-recovery";

/** Janela para concluir a troca depois de abrir o link (15 min). */
export const RECOVERY_COOKIE_MAX_AGE = 60 * 15;

export function recoveryCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RECOVERY_COOKIE_MAX_AGE,
  };
}
