import type { AuthError } from "@supabase/supabase-js";

/**
 * Tradução dos erros do Supabase Auth para mensagens claras em pt-BR.
 *
 * O Supabase varia entre `code`, `status` e `message` conforme a versão da API,
 * então checamos os três. Regra de ouro: mensagem útil para o usuário, sem
 * vazar se um e-mail existe ou não (ver `messageForResetRequestError`).
 */

interface Parsed {
  code: string;
  msg: string;
  status?: number;
}

function parse(error: AuthError): Parsed {
  return {
    code: (error as { code?: string }).code ?? "",
    msg: error.message?.toLowerCase() ?? "",
    status: error.status,
  };
}

function isRateLimit({ code, msg, status }: Parsed): boolean {
  return (
    status === 429 ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    msg.includes("rate limit") ||
    msg.includes("email rate")
  );
}

const RATE_LIMIT_MESSAGE =
  "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo (limite de envio de e-mails).";

/** Erros ao PEDIR o e-mail de recuperação (/forgot-password). */
export function messageForResetRequestError(error: AuthError): string {
  const p = parse(error);
  if (isRateLimit(p)) return RATE_LIMIT_MESSAGE;
  if (p.code === "validation_failed" || p.msg.includes("invalid email")) {
    return "E-mail inválido. Verifique e tente novamente.";
  }
  return "Não foi possível enviar o e-mail agora. Tente novamente em instantes.";
}

/** Erros ao DEFINIR a nova senha (/reset-password). */
export function messageForPasswordUpdateError(error: AuthError): string {
  const p = parse(error);
  if (isRateLimit(p)) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
  }
  if (p.code === "same_password" || p.msg.includes("should be different")) {
    return "A nova senha precisa ser diferente da senha atual.";
  }
  // "Secure password change" ligado no projeto + sessão que não veio de um link
  // de recuperação. O caminho certo é pedir um novo e-mail.
  if (p.code === "reauthentication_needed" || p.msg.includes("reauthentication")) {
    return "Por segurança, refaça a recuperação: peça um novo link de senha por e-mail.";
  }
  if (p.code === "weak_password" || p.msg.includes("password")) {
    return "Senha muito fraca. Use uma combinação mais longa e variada.";
  }
  if (isExpiredLink(p)) {
    return "Seu link de recuperação expirou. Peça um novo e-mail para continuar.";
  }
  return "Não foi possível alterar a senha. Tente novamente.";
}

/** Erros ao CRIAR conta (/register). */
export function messageForSignUpError(error: AuthError): string {
  const p = parse(error);
  if (isRateLimit(p)) return RATE_LIMIT_MESSAGE;
  if (p.code === "user_already_exists" || p.msg.includes("already")) {
    return "Este e-mail já está cadastrado. Tente fazer login.";
  }
  if (p.code === "weak_password" || p.msg.includes("password")) {
    return "A senha é muito fraca. Use ao menos 6 caracteres.";
  }
  if (p.code === "email_address_invalid" || (p.msg.includes("invalid") && p.msg.includes("email"))) {
    return "E-mail inválido. Verifique e tente novamente.";
  }
  if (
    p.code === "signup_disabled" ||
    p.msg.includes("signups not allowed") ||
    p.msg.includes("disabled")
  ) {
    return "Cadastros estão temporariamente desativados. Tente novamente mais tarde.";
  }
  return "Não foi possível criar a conta. Tente novamente.";
}

function isExpiredLink({ code, msg }: Parsed): boolean {
  return (
    code === "otp_expired" ||
    code === "flow_state_expired" ||
    msg.includes("expired") ||
    msg.includes("invalid flow state")
  );
}

/**
 * Motivos de falha que o /auth/callback repassa via `?error=` para as páginas
 * de login e de recuperação. Chaves curtas e estáveis — a mensagem mora aqui.
 */
export const CALLBACK_ERRORS = {
  expired_link: "Este link expirou ou já foi usado. Peça um novo e-mail de recuperação.",
  invalid_link: "Link inválido. Peça um novo e-mail de recuperação para continuar.",
  /** PKCE: o link foi aberto num navegador diferente do que pediu a troca. */
  different_browser:
    "Abra o link no mesmo navegador em que você pediu a recuperação — ou peça um novo e-mail por aqui.",
  auth: "Não foi possível concluir a autenticação. Tente novamente.",
} as const;

export type CallbackErrorKey = keyof typeof CALLBACK_ERRORS;

/** Converte `?error=` numa mensagem; ignora valores desconhecidos. */
export function messageForCallbackError(key: string | null): string | null {
  if (!key) return null;
  return CALLBACK_ERRORS[key as CallbackErrorKey] ?? null;
}

/**
 * Classifica a falha de verificação do link (troca de código / OTP) numa das
 * chaves acima, para o callback redirecionar com um motivo compreensível.
 */
export function classifyCallbackError(error: AuthError | null): CallbackErrorKey {
  if (!error) return "invalid_link";
  const p = parse(error);
  if (p.msg.includes("code verifier") || p.msg.includes("invalid flow state")) {
    return "different_browser";
  }
  if (isExpiredLink(p)) return "expired_link";
  return "invalid_link";
}
