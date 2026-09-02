"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "lvl2do.attackAnimation.v1";

/** Ausente ou ilegível = animação LIGADA. */
function loadDisabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    return false;
  }
}

/**
 * Preferência local "animação de ataque", no padrão de useAlarms/useNotifications:
 * estado inicial neutro (idêntico no SSR e no primeiro render, então zero
 * mismatch de hidratação), hidrata uma vez em efeito, persiste a cada mudança.
 *
 * O listener de `storage` existe porque a preferência é lida em DOIS lugares —
 * a página de configurações e o BossBattleRow — e o Row não remonta quando as
 * duas abas estão abertas.
 */
export function useAttackAnimationPref() {
  const [disabled, setDisabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const once = useRef(false);

  useEffect(() => {
    if (!once.current) {
      once.current = true;
      setDisabled(loadDisabled());
      setHydrated(true);
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) setDisabled(loadDisabled());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next: boolean) => {
    setDisabled(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "off" : "on");
    } catch {
      /* cota cheia ou storage bloqueado: a sessão atual ainda respeita a escolha */
    }
  }, []);

  return { disabled, hydrated, setDisabled: commit };
}
