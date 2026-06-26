"use client";

import { useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { updateMyProfile } from "@/lib/db/profiles";
import { isCharacterClass, type CharacterClass } from "@/data/characterClasses";

/**
 * Lê/grava a classe de personagem do usuário na tabela `profiles` (Supabase).
 * "Primeiro login" = sem classe definida (`character_class` vazio).
 */
export function useCharacterClass() {
  const { user, profile, loading, refreshProfile } = useAuth();

  const raw = profile?.character_class;
  const characterClass: CharacterClass | null = isCharacterClass(raw) ? raw : null;

  /** Persiste a classe escolhida no profile. */
  const setCharacterClass = useCallback(
    async (value: CharacterClass) => {
      await updateMyProfile({ character_class: value });
      await refreshProfile();
    },
    [refreshProfile],
  );

  return {
    isLoaded: !loading,
    isSignedIn: !!user,
    /** Classe atual ou null (null = ainda não escolheu → primeiro login). */
    characterClass,
    /** true quando o usuário está logado e ainda não tem classe. */
    needsClassSelection: !loading && !!user && characterClass === null,
    setCharacterClass,
  };
}
