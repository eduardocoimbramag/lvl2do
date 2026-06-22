import { Sword, VenetianMask, Target, Sparkles, Music, type LucideIcon } from "lucide-react";

/** Classes de personagem disponíveis na seleção inicial. */
export type CharacterClass = "Guerreiro" | "Ladrão" | "Arqueira" | "Bruxa" | "Bardo";

export interface CharacterClassMeta {
  id: CharacterClass;
  /** Ícone (fallback caso a imagem não carregue). */
  icon: LucideIcon;
  /** Prefixo dos arquivos de arte em /public/characters (ex.: "bruxa"). */
  slug: string;
  /** Frase curta de sabor para o card. */
  tagline: string;
  /** Classes utilitárias de cor (acento do card). */
  accent: string;
}

/**
 * Ordem fixa exibida na tela de seleção:
 * Guerreiro, Ladrão, Arqueira, Bruxa, Bardo.
 *
 * As artes ficam em /public/characters como `<slug>lv<faixa>.webp`, com
 * variantes que evoluem por nível (lv1, lv10, lv25, lv50, lv100).
 */
export const CHARACTER_CLASSES: CharacterClassMeta[] = [
  { id: "Guerreiro", icon: Sword, slug: "guerreiro", tagline: "Força e disciplina", accent: "text-rose-300 bg-rose-400/10 border-rose-400/20" },
  { id: "Ladrão", icon: VenetianMask, slug: "ladrao", tagline: "Agilidade e astúcia", accent: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
  { id: "Arqueira", icon: Target, slug: "arqueira", tagline: "Precisão e foco", accent: "text-sky-300 bg-sky-400/10 border-sky-400/20" },
  { id: "Bruxa", icon: Sparkles, slug: "bruxa", tagline: "Magia e intuição", accent: "text-fuchsia-300 bg-fuchsia-400/10 border-fuchsia-400/20" },
  { id: "Bardo", icon: Music, slug: "bardo", tagline: "Carisma e inspiração", accent: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
];

/** Lista só dos identificadores, na ordem oficial. */
export const CHARACTER_CLASS_IDS: CharacterClass[] = CHARACTER_CLASSES.map((c) => c.id);

/** Type guard: valida um valor desconhecido (ex.: vindo do metadata). */
export function isCharacterClass(value: unknown): value is CharacterClass {
  return typeof value === "string" && CHARACTER_CLASS_IDS.includes(value as CharacterClass);
}

/** Acessa a meta de uma classe pelo id (ou undefined). */
export function getClassMeta(id: CharacterClass): CharacterClassMeta | undefined {
  return CHARACTER_CLASSES.find((c) => c.id === id);
}

/**
 * Faixas (tiers) de skin disponíveis para cada classe — uma arte por faixa.
 * O nível necessário para desbloquear cada skin é o próprio número do tier.
 */
export type SkinTier = 1 | 10 | 25 | 50 | 100;

/** Todos os tiers de skin, em ordem crescente de desbloqueio. */
export const SKIN_TIERS: SkinTier[] = [1, 10, 25, 50, 100];

/** Type guard: o valor é um tier de skin válido? */
export function isSkinTier(value: unknown): value is SkinTier {
  return typeof value === "number" && (SKIN_TIERS as number[]).includes(value);
}

/** Rótulo curto do tier para a UI do carrossel (ex.: "Nível 25"). */
export function skinTierLabel(tier: SkinTier): string {
  return `Nível ${tier}`;
}

/**
 * Faixa de arte correspondente ao nível (variantes disponíveis em /public):
 * - 1–9   → lv1
 * - 10–24 → lv10
 * - 25–49 → lv25
 * - 50–99 → lv50
 * - 100+  → lv100
 */
export function levelArtTier(level: number): SkinTier {
  if (level >= 100) return 100;
  if (level >= 50) return 50;
  if (level >= 25) return 25;
  if (level >= 10) return 10;
  return 1;
}

/**
 * Uma skin está desbloqueada quando o nível do jogador alcançou (ou passou)
 * o nível do tier. Ex.: tier 25 desbloqueia a partir do nível 25.
 */
export function isSkinTierUnlocked(level: number, tier: SkinTier): boolean {
  return level >= tier;
}

/** O maior tier que o jogador já desbloqueou no nível atual (sempre ≥ 1). */
export function highestUnlockedTier(level: number): SkinTier {
  return levelArtTier(level);
}

/** Caminho da arte de uma classe para um tier específico (sem checar nível). */
export function getCharacterImageByTier(id: CharacterClass, tier: SkinTier): string {
  const meta = getClassMeta(id);
  if (!meta) return "";
  return `/characters/${meta.slug}lv${tier}.webp`;
}

/** Caminho da arte de uma classe para um dado nível (evolui por faixa). */
export function getCharacterImage(id: CharacterClass, level: number): string {
  return getCharacterImageByTier(id, levelArtTier(level));
}

/** Caminho da arte "final" (lv100) — usada nos cards de seleção de classe. */
export function getClassShowcaseImage(id: CharacterClass): string {
  return getCharacterImage(id, 100);
}
