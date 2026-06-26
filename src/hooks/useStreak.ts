"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { computeNextStreak } from "@/lib/streak";
import { getLocalDateKey } from "@/lib/xp-system";

interface UseStreakOptions {
  /** streak atual vindo do profile (0 = conta nova). */
  seedCurrent: number;
  /** maior streak vindo do profile. */
  seedBest: number;
  /** `last_mission_completed_at` (ISO) do profile, ou null. */
  seedLastCompletedAt: string | null;
  /** persiste o streak no banco (best-effort). */
  persist?: (current: number, best: number, lastCompletedAtISO: string) => void;
}

/** Converte um timestamp ISO em chave de data local "YYYY-MM-DD" (ou null). */
function isoToKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : getLocalDateKey(d);
}

/**
 * Gerencia o streak (dias consecutivos). Semeado do profile e atualizado de
 * forma otimista ao concluir a primeira missão do dia, persistindo no banco.
 */
export function useStreak({ seedCurrent, seedBest, seedLastCompletedAt, persist }: UseStreakOptions) {
  const [current, setCurrent] = useState(seedCurrent);
  const [best, setBest] = useState(seedBest);

  const currentRef = useRef(current);
  currentRef.current = current;
  const bestRef = useRef(best);
  bestRef.current = best;
  const lastKeyRef = useRef<string | null>(isoToKey(seedLastCompletedAt));

  // vira true na primeira conclusão da sessão — a partir daí o estado local é a
  // verdade e a semente do banco não sobrescreve mais.
  const dirty = useRef(false);
  const persistRef = useRef(persist);
  persistRef.current = persist;

  // re-semeia a partir do banco enquanto não houve interação (o profile pode
  // carregar depois da montagem).
  useEffect(() => {
    if (dirty.current) return;
    setCurrent(seedCurrent);
    setBest(seedBest);
    lastKeyRef.current = isoToKey(seedLastCompletedAt);
  }, [seedCurrent, seedBest, seedLastCompletedAt]);

  /** Registra a conclusão de uma missão (avança o streak no máximo 1x/dia). */
  const registerCompletion = useCallback(() => {
    const todayKey = getLocalDateKey(new Date());
    const next = computeNextStreak({
      lastCompletedKey: lastKeyRef.current,
      currentStreak: currentRef.current,
      bestStreak: bestRef.current,
      todayKey,
    });
    if (!next.changed) return;

    dirty.current = true;
    lastKeyRef.current = todayKey;
    setCurrent(next.current);
    setBest(next.best);
    persistRef.current?.(next.current, next.best, new Date().toISOString());
  }, []);

  return { current, best, registerCompletion };
}
