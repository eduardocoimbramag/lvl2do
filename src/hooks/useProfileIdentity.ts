"use client";

import { useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { updateMyProfile } from "@/lib/db/profiles";
import { formatHandle } from "@/data/identity";

/**
 * Identidade do jogador (nickname + hashtag), persistida na tabela `profiles`
 * do Supabase. O nickname pode repetir; a hashtag (3 chars) torna o par único
 * (garantido por `unique(nickname, tag)` no banco).
 */
export function useProfileIdentity() {
  const { user, profile, loading, refreshProfile } = useAuth();

  const nickname = profile?.nickname && profile.nickname.length > 0 ? profile.nickname : null;
  const tag = profile?.tag && profile.tag.length > 0 ? profile.tag : null;
  const hasIdentity = nickname !== null && tag !== null;

  /** Nome usado quando ainda não há nickname (nome do cadastro ou e-mail). */
  const fallbackName = profile?.name || user?.email?.split("@")[0] || null;

  /** Nome a exibir no app (nickname tem prioridade). */
  const displayName = nickname ?? fallbackName;

  /** Identificador completo "Nick#TAG" (ou null se ainda não cadastrado). */
  const handle = hasIdentity ? formatHandle(nickname!, tag!) : null;

  /** Persiste nickname + hashtag no profile. */
  const setIdentity = useCallback(
    async (nick: string, t: string) => {
      await updateMyProfile({ nickname: nick.trim(), tag: t.trim().toUpperCase() });
      await refreshProfile();
    },
    [refreshProfile],
  );

  return {
    isLoaded: !loading,
    isSignedIn: !!user,
    nickname,
    tag,
    hasIdentity,
    fallbackName,
    displayName,
    handle,
    setIdentity,
  };
}
