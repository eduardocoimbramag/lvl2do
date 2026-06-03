"use client";

import { useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { isCharacterClass, type CharacterClass } from "@/data/characterClasses";

/**
 * Lê/grava a classe de personagem do usuário no Clerk (unsafeMetadata).
 *
 * Por que unsafeMetadata: é editável pelo próprio cliente (o usuário escolhe a
 * própria classe) e fica ligada à conta — sobrevive a limpar o navegador e
 * funciona em qualquer dispositivo. "Primeiro login" = sem classe definida.
 */
export function useCharacterClass() {
  const { isLoaded, isSignedIn, user } = useUser();

  const raw = user?.unsafeMetadata?.characterClass;
  const characterClass: CharacterClass | null = isCharacterClass(raw) ? raw : null;

  /** Persiste a classe escolhida na conta Clerk. */
  const setCharacterClass = useCallback(
    async (value: CharacterClass) => {
      if (!user) return;
      await user.update({
        unsafeMetadata: { ...user.unsafeMetadata, characterClass: value },
      });
    },
    [user],
  );

  return {
    /** Clerk terminou de carregar o usuário? */
    isLoaded,
    isSignedIn: !!isSignedIn,
    /** Classe atual ou null (null = ainda não escolheu → primeiro login). */
    characterClass,
    /** true quando o usuário está logado e ainda não tem classe. */
    needsClassSelection: isLoaded && !!isSignedIn && characterClass === null,
    setCharacterClass,
  };
}
