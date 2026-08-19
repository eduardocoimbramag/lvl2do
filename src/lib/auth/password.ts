/**
 * Política de senha — fonte única da verdade.
 *
 * Usada no cliente (feedback imediato) E no servidor (validação real, que é a
 * que vale). O mínimo espelha o padrão do Supabase Auth; se você aumentar o
 * mínimo no dashboard, aumente aqui também.
 */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * Valida a senha segundo a política. Retorna a mensagem de erro em pt-BR ou
 * `null` quando está tudo certo.
 */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > 72) {
    // limite do bcrypt usado pelo Supabase — acima disso os bytes são ignorados
    return "A senha pode ter no máximo 72 caracteres.";
  }
  return null;
}

export interface PasswordStrength {
  /** 0–4 */
  score: number;
  label: string;
  /** classe tailwind da barra preenchida */
  barClass: string;
  /** classe tailwind do texto do rótulo */
  textClass: string;
}

const LEVELS: PasswordStrength[] = [
  { score: 0, label: "Muito fraca", barClass: "bg-red-500", textClass: "text-red-400" },
  { score: 1, label: "Fraca", barClass: "bg-red-500", textClass: "text-red-400" },
  { score: 2, label: "Razoável", barClass: "bg-amber-500", textClass: "text-amber-300" },
  { score: 3, label: "Boa", barClass: "bg-lime-500", textClass: "text-lime-300" },
  { score: 4, label: "Forte", barClass: "bg-emerald-500", textClass: "text-emerald-300" },
];

/**
 * Medidor de força — heurística leve (tamanho + variedade de caracteres).
 * É ORIENTATIVO: nunca bloqueia o envio, só orienta o usuário. O bloqueio real
 * é `validatePassword`.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return LEVELS[0];

  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  // sequências óbvias derrubam a nota, por mais longas que sejam
  if (/^(.)\1+$/.test(password) || /^(123456|senha|password|qwerty)/i.test(password)) {
    score = 0;
  }

  return LEVELS[Math.min(score, 4)];
}
