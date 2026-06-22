"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyInactiveDayLoss,
  applyXpGain,
  applyXpRevert,
  calculateCurrentLevelProgress,
  calculateLevelFromXp,
  getInactiveDays,
  getLocalDateKey,
  DAILY_XP_LIMIT,
  type UserStats,
  type XpGainResult,
  type XpLossResult,
  type XpRevertResult,
} from "@/lib/xp-system";

const STORAGE_KEY = "lvl2do.userStats.v1";

/**
 * Estado inicial (semente). Representa um usuário em progresso — coerente com
 * o mock anterior (Nível 4). Quando houver banco, isto vem do backend.
 * totalXp 2740 = piso do Nível 4 (2400) + 340 de progresso no nível.
 */
function initialStats(): UserStats {
  const todayKey = getLocalDateKey(new Date());
  const totalXp = 2740;
  return {
    totalXp,
    level: calculateLevelFromXp(totalXp),
    dailyXp: 0,
    dailyXpDate: todayKey,
    lastMissionCompletedDate: todayKey,
    lastXpLossCheckDate: todayKey,
  };
}

/** Carrega do localStorage (ou semente). Tolerante a dados ausentes/corrompidos. */
function loadStats(): UserStats {
  if (typeof window === "undefined") return initialStats();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialStats();
    const parsed = JSON.parse(raw) as Partial<UserStats>;
    const base = initialStats();
    const merged: UserStats = { ...base, ...parsed };
    // garante o level coerente com o totalXp persistido
    merged.level = calculateLevelFromXp(merged.totalXp);
    return merged;
  } catch {
    return initialStats();
  }
}

/** Feedback exibido ao usuário após concluir/desfazer uma missão ou perder XP. */
export type StatsFeedback = {
  kind: "gain" | "loss" | "revert";
  /** XP creditado (gain) ou removido como número negativo (loss/revert). */
  xp: number;
  /** XP base da missão (apenas em gain). */
  baseXp?: number;
  /** o ganho foi reduzido pelo limite diário. */
  wasCapped?: boolean;
  /** o limite diário foi atingido. */
  reachedDailyLimit?: boolean;
  /** dias inativos (apenas em loss). */
  inactiveDays?: number;
  /** variação de nível (+ subiu, - desceu). */
  levelDelta: number;
  /** nível resultante. */
  level: number;
};

/**
 * Hook de progressão do usuário (XP / Level), com persistência em localStorage.
 *
 * - `completeMission(xp)` aplica o ganho com limite diário e retorna o feedback.
 * - Na montagem, `checkInactiveDays()` desconta XP por dias inteiros sem
 *   atividade (sem nunca descontar o mesmo dia duas vezes).
 *
 * FUTURO: trocar a persistência local por chamadas ao banco — as regras de XP
 * ficam intactas em `@/lib/xp-system`.
 */
export function useUserStats() {
  const [stats, setStats] = useState<UserStats>(initialStats);
  const [feedback, setFeedback] = useState<StatsFeedback | null>(null);
  const hydrated = useRef(false);
  // Fonte SÍNCRONA de verdade. As mutações calculam a partir daqui (fora do
  // updater do setState), evitando dupla-execução do Strict Mode e garantindo
  // que completeMission/revertMission retornem o resultado correto na hora.
  const statsRef = useRef<UserStats>(stats);

  /** Persiste no localStorage e mantém statsRef + estado sincronizados. */
  const commit = useCallback((value: UserStats) => {
    statsRef.current = value;
    setStats(value);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        /* ignora cota/erros de storage */
      }
    }
  }, []);

  // Hidrata do localStorage e roda a verificação de inatividade — uma vez.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const loaded = loadStats();
    const now = new Date();
    const todayKey = getLocalDateKey(now);

    // reseta o contador diário se virou o dia
    let next: UserStats =
      loaded.dailyXpDate === todayKey
        ? loaded
        : { ...loaded, dailyXp: 0, dailyXpDate: todayKey };

    // --- verificação de inatividade (anti-duplicação via lastXpLossCheckDate) ---
    // base = o último ponto já considerado; nunca reprocessa dias antigos.
    const baseDate =
      next.lastXpLossCheckDate ?? next.lastMissionCompletedDate ?? todayKey;
    const inactiveDays = getInactiveDays(baseDate, now);

    if (inactiveDays > 0) {
      const result = applyInactiveDayLoss(next, inactiveDays);
      next = {
        ...result.stats,
        // marca como verificado até ontem (o dia atual ainda não terminou)
        lastXpLossCheckDate: todayKey,
      };
      if (result.xpLost > 0) {
        setFeedback({
          kind: "loss",
          xp: -result.xpLost,
          inactiveDays: result.inactiveDays,
          levelDelta: -result.levelDrop,
          level: result.levelAfter,
        });
      }
    } else {
      next = { ...next, lastXpLossCheckDate: todayKey };
    }

    commit(next);
  }, [commit]);

  /**
   * Conclui uma missão: credita XP (com limite diário), recalcula o level,
   * registra atividade do dia e emite feedback. Retorna o resultado bruto.
   */
  const completeMission = useCallback(
    (missionXp: number): XpGainResult => {
      const todayKey = getLocalDateKey(new Date());
      // calcula a partir da fonte síncrona (não do updater)
      const result = applyXpGain(statsRef.current, missionXp, todayKey);
      commit({ ...result.stats, lastXpLossCheckDate: todayKey });

      setFeedback({
        kind: "gain",
        xp: result.earnedXp,
        baseXp: result.baseXp,
        wasCapped: result.wasCapped,
        reachedDailyLimit: result.reachedDailyLimit,
        levelDelta: result.levelDelta,
        level: result.levelAfter,
      });

      return result;
    },
    [commit],
  );

  /**
   * Reverte o XP de uma missão ao desfazer sua conclusão. Recebe o XP que foi
   * EFETIVAMENTE creditado (pode ter sido reduzido pelo limite diário) e o
   * devolve com exatidão, recalculando o nível (XP total, diário e level).
   */
  const revertMission = useCallback(
    (creditedXp: number): XpRevertResult => {
      const todayKey = getLocalDateKey(new Date());
      const result = applyXpRevert(statsRef.current, creditedXp, todayKey);
      commit(result.stats);

      if (result.revertedXp > 0) {
        setFeedback({
          kind: "revert",
          xp: -result.revertedXp,
          levelDelta: -result.levelDrop,
          level: result.levelAfter,
        });
      }

      return result;
    },
    [commit],
  );

  /** Aplica manualmente a perda de N dias inativos (uso em demo/teste). */
  const simulateInactiveDays = useCallback(
    (days: number): XpLossResult => {
      const result = applyInactiveDayLoss(statsRef.current, days);
      commit(result.stats);
      if (result.xpLost > 0) {
        setFeedback({
          kind: "loss",
          xp: -result.xpLost,
          inactiveDays: result.inactiveDays,
          levelDelta: -result.levelDrop,
          level: result.levelAfter,
        });
      }
      return result;
    },
    [commit],
  );

  /** Reinicia as estatísticas para a semente (uso em demo/teste). */
  const resetStats = useCallback(() => {
    commit(initialStats());
    setFeedback(null);
  }, [commit]);

  const dismissFeedback = useCallback(() => setFeedback(null), []);

  // Progresso derivado do XP total (level, xp no nível, % etc.).
  const progress = useMemo(
    () => calculateCurrentLevelProgress(stats.totalXp),
    [stats.totalXp],
  );

  // Estado do limite diário (para avisos na UI).
  const daily = useMemo(() => {
    const used = stats.dailyXp;
    const reachedLimit = used >= DAILY_XP_LIMIT;
    const nearLimit = !reachedLimit && used >= 250;
    return { used, limit: DAILY_XP_LIMIT, reachedLimit, nearLimit };
  }, [stats.dailyXp]);

  return {
    stats,
    progress,
    daily,
    feedback,
    completeMission,
    revertMission,
    simulateInactiveDays,
    resetStats,
    dismissFeedback,
  };
}
