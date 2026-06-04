"use client";

import { useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  getCharacterImageByTier,
  isSkinTier,
  isSkinTierUnlocked,
  levelArtTier,
  type CharacterClass,
  type SkinTier,
} from "@/data/characterClasses";

/**
 * Preferência de skin do usuário:
 * - "auto"  → a skin acompanha o nível automaticamente (padrão).
 * - <tier>  → o usuário fixou uma skin de um nível anterior já desbloqueado.
 */
export type SkinPreference = "auto" | SkinTier;

/** Type guard tolerante para o valor vindo do metadata. */
function parseSkinPreference(value: unknown): SkinPreference {
  if (value === "auto") return "auto";
  if (isSkinTier(value)) return value;
  return "auto";
}

/**
 * Lê/grava a preferência de skin do personagem no Clerk (unsafeMetadata).
 *
 * Por que unsafeMetadata: editável pelo próprio cliente, ligada à conta e
 * sobrevive a trocar de dispositivo — mesmo padrão de useCharacterClass.
 *
 * Regra de resolução (fonte de verdade para Dashboard e Perfil):
 * - "auto"      → tier = faixa do nível atual (evolui sozinho).
 * - tier fixo   → usa o tier escolhido, MAS faz clamp: se por algum motivo o
 *                 nível caiu abaixo desse tier (ex.: perda de XP / nível), cai
 *                 para a maior skin ainda desbloqueada. Nunca mostra bloqueada.
 */
export function useCharacterSkin() {
  const { isLoaded, user } = useUser();

  const skinPreference = parseSkinPreference(user?.unsafeMetadata?.skinTier);

  /** Persiste a preferência ("auto" ou um tier) na conta Clerk. */
  const setSkinPreference = useCallback(
    async (value: SkinPreference) => {
      if (!user) return;
      await user.update({
        unsafeMetadata: { ...user.unsafeMetadata, skinTier: value },
      });
    },
    [user],
  );

  /** Volta a skin a acompanhar o nível automaticamente. */
  const resetToAuto = useCallback(() => setSkinPreference("auto"), [setSkinPreference]);

  /**
   * Resolve qual tier de skin deve ser exibido para um dado nível, aplicando a
   * regra acima (auto vs. fixo, com clamp ao desbloqueado).
   */
  const resolveTier = useCallback(
    (level: number): SkinTier => {
      const autoTier = levelArtTier(level);
      if (skinPreference === "auto") return autoTier;
      // fixo, mas só se ainda estiver desbloqueado; senão cai para o auto.
      return isSkinTierUnlocked(level, skinPreference) ? skinPreference : autoTier;
    },
    [skinPreference],
  );

  /**
   * Caminho da arte resolvida para a classe + nível, honrando a preferência.
   * Use isto em vez de getCharacterImage onde houver escolha de roupa.
   */
  const resolveImage = useCallback(
    (id: CharacterClass, level: number): string =>
      getCharacterImageByTier(id, resolveTier(level)),
    [resolveTier],
  );

  return {
    isLoaded,
    /** "auto" ou o tier fixado pelo usuário. */
    skinPreference,
    /** true quando a skin está seguindo o nível automaticamente. */
    isAuto: skinPreference === "auto",
    setSkinPreference,
    resetToAuto,
    resolveTier,
    resolveImage,
  };
}
