"use client";

import { useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { updateMyProfile } from "@/lib/db/profiles";
import {
  toCharacterBackground,
  type CharacterBackgroundId,
} from "@/data/characterBackgrounds";

/**
 * Lê/grava o fundo da moldura do personagem em `profiles.character_background`.
 *
 * Mesma forma do `useCharacterSkin`: o valor vive no profile, a escrita passa
 * por `updateMyProfile` e o `refreshProfile` propaga para todas as telas que
 * usam a moldura (Perfil e Dashboard) sem precisar de estado global próprio.
 */
export function useCharacterBackground() {
  const { profile, loading, refreshProfile } = useAuth();

  const background = toCharacterBackground(profile?.character_background);

  const setBackground = useCallback(
    async (value: CharacterBackgroundId) => {
      await updateMyProfile({ character_background: value });
      await refreshProfile();
    },
    [refreshProfile],
  );

  return { isLoaded: !loading, background, setBackground };
}
