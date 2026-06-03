import { Sword, VenetianMask, Target, Sparkles, Music, type LucideIcon } from "lucide-react";

/** Classes de personagem disponíveis na seleção inicial. */
export type CharacterClass = "Guerreiro" | "Ladrão" | "Arqueira" | "Bruxa" | "Bardo";

export interface CharacterClassMeta {
  id: CharacterClass;
  /** Ícone placeholder (será substituído pela arte do personagem). */
  icon: LucideIcon;
  /** Frase curta de sabor para o card. */
  tagline: string;
  /** Classes utilitárias de cor (acento do card). */
  accent: string;
}

/**
 * Ordem fixa exibida na tela de seleção:
 * Guerreiro, Ladrão, Arqueira, Bruxa, Bardo.
 *
 * Os ícones são placeholders — quando as imagens chegarem, basta trocar a
 * renderização do card por <Image> mantendo este mesmo modelo de dados.
 */
export const CHARACTER_CLASSES: CharacterClassMeta[] = [
  { id: "Guerreiro", icon: Sword, tagline: "Força e disciplina", accent: "text-rose-300 bg-rose-400/10 border-rose-400/20" },
  { id: "Ladrão", icon: VenetianMask, tagline: "Agilidade e astúcia", accent: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
  { id: "Arqueira", icon: Target, tagline: "Precisão e foco", accent: "text-sky-300 bg-sky-400/10 border-sky-400/20" },
  { id: "Bruxa", icon: Sparkles, tagline: "Magia e intuição", accent: "text-fuchsia-300 bg-fuchsia-400/10 border-fuchsia-400/20" },
  { id: "Bardo", icon: Music, tagline: "Carisma e inspiração", accent: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
];

/** Lista só dos identificadores, na ordem oficial. */
export const CHARACTER_CLASS_IDS: CharacterClass[] = CHARACTER_CLASSES.map((c) => c.id);

/** Type guard: valida um valor desconhecido (ex.: vindo do metadata). */
export function isCharacterClass(value: unknown): value is CharacterClass {
  return typeof value === "string" && CHARACTER_CLASS_IDS.includes(value as CharacterClass);
}
