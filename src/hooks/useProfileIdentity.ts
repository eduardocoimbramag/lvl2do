"use client";

import { useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { formatHandle } from "@/data/identity";

/**
 * Lê/grava a identidade do jogador (nickname + hashtag) no Clerk
 * (unsafeMetadata), no mesmo padrão de `useCharacterClass`.
 *
 * - nickname pode repetir entre jogadores;
 * - a hashtag (3 chars) torna o par único.
 */
export function useProfileIdentity() {
  const { isLoaded, isSignedIn, user } = useUser();

  const rawNick = user?.unsafeMetadata?.nickname;
  const rawTag = user?.unsafeMetadata?.tag;
  const nickname = typeof rawNick === "string" && rawNick.length > 0 ? rawNick : null;
  const tag = typeof rawTag === "string" && rawTag.length > 0 ? rawTag : null;

  const hasIdentity = nickname !== null && tag !== null;

  /** Nome usado quando ainda não há nickname (cai para o nome do Clerk). */
  const fallbackName =
    user?.fullName || user?.firstName || user?.username || null;

  /** Nome a exibir no app (nickname tem prioridade). */
  const displayName = nickname ?? fallbackName;

  /** Identificador completo "Nick#TAG" (ou null se ainda não cadastrado). */
  const handle = hasIdentity ? formatHandle(nickname!, tag!) : null;

  /** Persiste nickname + hashtag na conta (preserva o resto do metadata). */
  const setIdentity = useCallback(
    async (nick: string, t: string) => {
      if (!user) return;
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          nickname: nick.trim(),
          tag: t.trim().toUpperCase(),
        },
      });
    },
    [user],
  );

  return {
    isLoaded,
    isSignedIn: !!isSignedIn,
    nickname,
    tag,
    hasIdentity,
    fallbackName,
    displayName,
    handle,
    setIdentity,
  };
}
