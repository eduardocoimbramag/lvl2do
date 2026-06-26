"use client";

import { useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { updateMyProfile } from "@/lib/db/profiles";
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

/** Type guard tolerante para o valor vindo do banco (`character_skin`: texto). */
function parseSkinPreference(value: unknown): SkinPreference {
  if (value === "auto") return "auto";
  const n = typeof value === "string" ? Number(value) : value;
  if (isSkinTier(n)) return n;
  return "auto";
}

/**
 * Lê/grava a preferência de skin do personagem na tabela `profiles`
 * (`character_skin`, como texto: "auto" ou o número do tier).
 *
 * Regra de resolução (fonte de verdade para Dashboard e Perfil):
 * - "auto"      → tier = faixa do nível atual (evolui sozinho).
 * - tier fixo   → usa o tier escolhido, com clamp ao maior desbloqueado.
 */
export function useCharacterSkin() {
  const { profile, loading, refreshProfile } = useAuth();

  const skinPreference = parseSkinPreference(profile?.character_skin);

  /** Persiste a preferência ("auto" ou um tier) no profile. */
  const setSkinPreference = useCallback(
    async (value: SkinPreference) => {
      await updateMyProfile({ character_skin: String(value) });
      await refreshProfile();
    },
    [refreshProfile],
  );

  /** Volta a skin a acompanhar o nível automaticamente. */
  const resetToAuto = useCallback(() => setSkinPreference("auto"), [setSkinPreference]);

  const resolveTier = useCallback(
    (level: number): SkinTier => {
      const autoTier = levelArtTier(level);
      if (skinPreference === "auto") return autoTier;
      return isSkinTierUnlocked(level, skinPreference) ? skinPreference : autoTier;
    },
    [skinPreference],
  );

  const resolveImage = useCallback(
    (id: CharacterClass, level: number): string =>
      getCharacterImageByTier(id, resolveTier(level)),
    [resolveTier],
  );

  return {
    isLoaded: !loading,
    skinPreference,
    isAuto: skinPreference === "auto",
    setSkinPreference,
    resetToAuto,
    resolveTier,
    resolveImage,
  };
}
