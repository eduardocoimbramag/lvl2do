/**
 * Identidade do jogador: nickname + hashtag (ex.: "Eduardo#A2K").
 *
 * Regra: o NICKNAME pode se repetir entre jogadores, mas o par
 * `nickname#hashtag` precisa ser único — a hashtag (3 caracteres) é o que
 * diferencia duas pessoas com o mesmo nickname.
 *
 * Como o projeto é mock (sem backend), a unicidade é validada contra um
 * conjunto fixo (TAKEN_HANDLES). Ao integrar o banco, troque por uma checagem
 * real no servidor.
 */

export const NICK_MIN = 3;
export const NICK_MAX = 16;
export const TAG_LEN = 3;

/** Letras (com acento), números, espaço, _ e - — entre 3 e 16 caracteres. */
const NICK_RE = /^[\p{L}\p{N} _-]+$/u;
/** Exatamente 3 caracteres alfanuméricos (após normalizar p/ maiúsculas). */
const TAG_RE = /^[A-Z0-9]{3}$/;

/** Alfabeto das sugestões (sem caracteres ambíguos: O/0, I/1). */
const SUGGEST_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Chave canônica de um handle (nick minúsculo + tag maiúscula). */
export function handleKey(nickname: string, tag: string): string {
  return `${nickname.trim().toLowerCase()}#${tag.trim().toUpperCase()}`;
}

/** Identificador exibível (ex.: "Eduardo#A2K"). */
export function formatHandle(nickname: string, tag: string): string {
  return `${nickname.trim()}#${tag.trim().toUpperCase()}`;
}

/** Sanitiza a digitação da hashtag (maiúsculas, só alfanumérico, máx. 3). */
export function sanitizeTag(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, TAG_LEN);
}

/** Handles já em uso (mock) — pares nickname#hashtag ocupados. */
const RAW_TAKEN: [string, string][] = [
  ["Eduardo", "001"],
  ["Eduardo", "ABC"],
  ["Marina", "7K2"],
  ["Aiko", "JP1"],
  ["Player", "GG1"],
  ["Ninja", "X99"],
  ["Bruxa", "666"],
];

export const TAKEN_HANDLES = new Set<string>(RAW_TAKEN.map(([n, t]) => handleKey(n, t)));

/** O par nickname#hashtag já está ocupado? (ignora o próprio handle atual). */
export function isHandleTaken(nickname: string, tag: string, exclude?: string): boolean {
  const key = handleKey(nickname, tag);
  if (exclude && key === exclude) return false;
  return TAKEN_HANDLES.has(key);
}

/** Gera uma hashtag aleatória (apenas em handlers/efeitos — usa Math.random). */
export function randomTag(): string {
  let t = "";
  for (let i = 0; i < TAG_LEN; i++) {
    t += SUGGEST_ALPHABET[Math.floor(Math.random() * SUGGEST_ALPHABET.length)];
  }
  return t;
}

/** Sugere uma hashtag livre para um dado nickname. */
export function suggestTag(nickname: string): string {
  for (let i = 0; i < 50; i++) {
    const t = randomTag();
    if (!isHandleTaken(nickname, t)) return t;
  }
  return randomTag();
}

export interface IdentityValidation {
  nickError: string | null;
  tagError: string | null;
  ok: boolean;
}

/** Valida nickname + hashtag (formato + unicidade do par). */
export function validateIdentity(
  nickname: string,
  tag: string,
  exclude?: string,
): IdentityValidation {
  const nick = nickname.trim();
  const t = tag.trim().toUpperCase();

  let nickError: string | null = null;
  let tagError: string | null = null;

  if (nick.length < NICK_MIN) nickError = `Mínimo de ${NICK_MIN} caracteres.`;
  else if (nick.length > NICK_MAX) nickError = `Máximo de ${NICK_MAX} caracteres.`;
  else if (!NICK_RE.test(nick)) nickError = "Use letras, números, espaço, _ ou -.";

  if (t.length !== TAG_LEN) tagError = `A hashtag deve ter ${TAG_LEN} caracteres.`;
  else if (!TAG_RE.test(t)) tagError = "Use apenas letras e números.";

  // unicidade só quando o formato é válido
  if (!nickError && !tagError && isHandleTaken(nick, t, exclude)) {
    tagError = "Esse nick com essa hashtag já existe. Tente outra hashtag.";
  }

  return { nickError, tagError, ok: !nickError && !tagError };
}
