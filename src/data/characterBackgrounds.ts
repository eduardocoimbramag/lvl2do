/**
 * Fundos da moldura do personagem (Perfil > "Trocar fundo").
 *
 * A arte é VETORIAL, desenhada em `@/components/CharacterBackdrop` — não há
 * arquivo de imagem. Isso mantém o download em zero, deixa o fundo nítido em
 * qualquer tamanho (a moldura vai de 56 px no trilho a 176 px no perfil) e
 * permite usar os tokens de marca em vez de cores chapadas.
 *
 * As artes dos personagens são WebP com canal alfa (fundo transparente), então
 * o que estiver atrás aparece de verdade.
 */

export type CharacterBackgroundId = "none" | "castelo" | "trono" | "floresta";

export interface CharacterBackground {
  id: CharacterBackgroundId;
  label: string;
  /** frase curta mostrada sob o nome no seletor. */
  description: string;
}

export const CHARACTER_BACKGROUNDS: CharacterBackground[] = [
  {
    id: "none",
    label: "Padrão",
    description: "Fundo escuro, sem cenário",
  },
  {
    id: "castelo",
    label: "Muralha",
    description: "Pedra de castelo à luz da tocha",
  },
  {
    id: "trono",
    label: "Salão do trono",
    description: "Arco gótico e estandartes",
  },
  {
    id: "floresta",
    label: "Floresta",
    description: "Mata enevoada ao luar",
  },
];

const IDS = new Set<string>(CHARACTER_BACKGROUNDS.map((b) => b.id));

/** Type guard para o valor vindo do banco (`character_background`: texto). */
export function isCharacterBackground(value: unknown): value is CharacterBackgroundId {
  return typeof value === "string" && IDS.has(value);
}

/** Fundo válido com fallback para o padrão. */
export function toCharacterBackground(value: unknown): CharacterBackgroundId {
  return isCharacterBackground(value) ? value : "none";
}

/** Metadados de um fundo (nunca null: cai no padrão). */
export function getCharacterBackground(id: CharacterBackgroundId): CharacterBackground {
  return CHARACTER_BACKGROUNDS.find((b) => b.id === id) ?? CHARACTER_BACKGROUNDS[0];
}
