import { Sword, VenetianMask, Target, Sparkles, Music, type LucideIcon } from "lucide-react";

/** Classes de personagem disponíveis na seleção inicial. */
export type CharacterClass = "Guerreiro" | "Ladrão" | "Arqueira" | "Bruxa" | "Bardo";

export interface CharacterClassMeta {
  id: CharacterClass;
  /** Ícone (fallback caso a imagem não carregue). */
  icon: LucideIcon;
  /** Arte do personagem (em /public). */
  image: string;
  /** Frase curta de sabor para o card. */
  tagline: string;
  /** Classes utilitárias de cor (acento do card). */
  accent: string;
}

/**
 * Ordem fixa exibida na tela de seleção:
 * Guerreiro, Ladrão, Arqueira, Bruxa, Bardo.
 *
 * As artes ficam em /public/characters (variantes por nível). Os cards de
 * seleção usam a arte de nível 100; o ícone serve apenas de fallback.
 */
export const CHARACTER_CLASSES: CharacterClassMeta[] = [
  { id: "Guerreiro", icon: Sword, image: "/characters/guerreirolv100.webp", tagline: "Força e disciplina", accent: "text-rose-300 bg-rose-400/10 border-rose-400/20" },
  { id: "Ladrão", icon: VenetianMask, image: "/characters/ladraolv100.webp", tagline: "Agilidade e astúcia", accent: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
  { id: "Arqueira", icon: Target, image: "/characters/arqueiralv100.webp", tagline: "Precisão e foco", accent: "text-sky-300 bg-sky-400/10 border-sky-400/20" },
  { id: "Bruxa", icon: Sparkles, image: "/characters/bruxalv100.webp", tagline: "Magia e intuição", accent: "text-fuchsia-300 bg-fuchsia-400/10 border-fuchsia-400/20" },
  { id: "Bardo", icon: Music, image: "/characters/bardolv100.webp", tagline: "Carisma e inspiração", accent: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
];

/** Lista só dos identificadores, na ordem oficial. */
export const CHARACTER_CLASS_IDS: CharacterClass[] = CHARACTER_CLASSES.map((c) => c.id);

/** Type guard: valida um valor desconhecido (ex.: vindo do metadata). */
export function isCharacterClass(value: unknown): value is CharacterClass {
  return typeof value === "string" && CHARACTER_CLASS_IDS.includes(value as CharacterClass);
}
