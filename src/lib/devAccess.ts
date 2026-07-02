/**
 * Controle de acesso a ferramentas de desenvolvimento/administração.
 *
 * A "Área de ADM" (ex.: reset de conta para testes) fica visível SOMENTE para
 * os e-mails listados aqui. Como é uma checagem de UI, ela apenas ESCONDE a
 * ferramenta — a proteção real dos dados é o RLS do Supabase (cada usuário só
 * consegue apagar/alterar as próprias linhas).
 */

/** E-mails com acesso à Área de ADM (minúsculo). */
export const DEV_EMAILS = ["eduardocoimbramag@gmail.com"];

/** O e-mail informado tem acesso de dev/adm? */
export function isDevUser(email?: string | null): boolean {
  return !!email && DEV_EMAILS.includes(email.toLowerCase());
}
