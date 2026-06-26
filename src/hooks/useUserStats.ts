"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyXpGain,
  applyXpRevert,
  calculateCurrentLevelProgress,
  calculateLevelFromXp,
  getLocalDateKey,
  DAILY_XP_LIMIT,
  type UserStats,
  type XpGainResult,
  type XpRevertResult,
} from "@/lib/xp-system";

/** Feedback exibido ao usuário após concluir/desfazer uma missão. */
export type StatsFeedback = {
  kind: "gain" | "revert";
  /** XP creditado (gain) ou removido como número negativo (revert). */
  xp: number;
  baseXp?: number;
  wasCapped?: boolean;
  reachedDailyLimit?: boolean;
  levelDelta: number;
  level: number;
};

interface UseUserStatsOptions {
  /** XP total inicial vindo do banco (profile.total_xp). 0 = conta nova. */
  seedTotalXp: number;
  /** XP diário já usado, vindo do banco (profile.daily_xp). */
  seedDailyXp?: number;
  /** Dia ("YYYY-MM-DD") a que o XP diário se refere (profile.daily_xp_date). */
  seedDailyXpDate?: string | null;
  /** persiste XP/level + contador diário no banco (best-effort). */
  persistStats?: (totalXp: number, level: number, dailyXp: number, dailyXpDate: string) => void;
}

/**
 * Normaliza o contador diário vindo do banco: se a data não é a de hoje, o
 * orçamento diário recomeça em 0 (novo dia local).
 */
function seedDaily(seedDailyXp: number, seedDailyXpDate: string | null | undefined, todayKey: string) {
  return seedDailyXpDate === todayKey
    ? { dailyXp: Math.max(0, seedDailyXp), dailyXpDate: todayKey }
    : { dailyXp: 0, dailyXpDate: todayKey };
}

/**
 * Progressão do usuário (XP/Level + contador diário), tudo vindo do banco
 * (Supabase) via `seed*` e persistido a cada mudança. As regras de XP vivem em
 * `@/lib/xp-system`.
 */
export function useUserStats({
  seedTotalXp,
  seedDailyXp = 0,
  seedDailyXpDate = null,
  persistStats,
}: UseUserStatsOptions) {
  const [stats, setStats] = useState<UserStats>(() => {
    const todayKey = getLocalDateKey(new Date());
    const daily = seedDaily(seedDailyXp, seedDailyXpDate, todayKey);
    return {
      totalXp: seedTotalXp,
      level: calculateLevelFromXp(seedTotalXp),
      dailyXp: daily.dailyXp,
      dailyXpDate: daily.dailyXpDate,
      lastMissionCompletedDate: null,
      lastXpLossCheckDate: todayKey,
    };
  });
  const [feedback, setFeedback] = useState<StatsFeedback | null>(null);

  const statsRef = useRef<UserStats>(stats);
  // vira true quando o usuário conclui/desfaz nesta sessão — a partir daí o XP
  // local é a verdade e a semente do banco não sobrescreve mais.
  const dirty = useRef(false);
  const persistRef = useRef(persistStats);
  persistRef.current = persistStats;

  // re-semeia a partir do banco enquanto não houve interação nesta sessão
  // (ex.: o profile carrega depois da montagem).
  useEffect(() => {
    if (dirty.current) return;
    const todayKey = getLocalDateKey(new Date());
    const daily = seedDaily(seedDailyXp, seedDailyXpDate, todayKey);
    const next: UserStats = {
      ...statsRef.current,
      totalXp: seedTotalXp,
      level: calculateLevelFromXp(seedTotalXp),
      dailyXp: daily.dailyXp,
      dailyXpDate: daily.dailyXpDate,
    };
    statsRef.current = next;
    setStats(next);
  }, [seedTotalXp, seedDailyXp, seedDailyXpDate]);

  const commit = useCallback((value: UserStats) => {
    statsRef.current = value;
    setStats(value);
    persistRef.current?.(value.totalXp, value.level, value.dailyXp, value.dailyXpDate);
  }, []);

  const completeMission = useCallback(
    (missionXp: number): XpGainResult => {
      dirty.current = true;
      const todayKey = getLocalDateKey(new Date());
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

  const revertMission = useCallback(
    (creditedXp: number): XpRevertResult => {
      dirty.current = true;
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

  const dismissFeedback = useCallback(() => setFeedback(null), []);

  const progress = useMemo(
    () => calculateCurrentLevelProgress(stats.totalXp),
    [stats.totalXp],
  );

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
    dismissFeedback,
  };
}
