"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyXpGain,
  applyXpRevert,
  applyXpGainForDay,
  applyXpRevertForDay,
  normalizeDailyBudgets,
  previousDateKey,
  dayBudgetKind,
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
  /** XP usado no orçamento de ontem (profile.yesterday_xp). */
  seedYesterdayXp?: number;
  /** Dia ("YYYY-MM-DD") a que o XP de ontem se refere (profile.yesterday_xp_date). */
  seedYesterdayXpDate?: string | null;
  /** persiste XP/level + contadores diários (hoje e ontem) no banco (best-effort). */
  persistStats?: (snapshot: {
    totalXp: number;
    level: number;
    dailyXp: number;
    dailyXpDate: string;
    yesterdayXp: number;
    yesterdayXpDate: string | null;
  }) => void;
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
  seedYesterdayXp = 0,
  seedYesterdayXpDate = null,
  persistStats,
}: UseUserStatsOptions) {
  const [stats, setStats] = useState<UserStats>(() => {
    const todayKey = getLocalDateKey(new Date());
    const daily = seedDaily(seedDailyXp, seedDailyXpDate, todayKey);
    const seeded: UserStats = {
      totalXp: seedTotalXp,
      level: calculateLevelFromXp(seedTotalXp),
      dailyXp: daily.dailyXp,
      dailyXpDate: daily.dailyXpDate,
      yesterdayXp: Math.max(0, seedYesterdayXp),
      yesterdayXpDate: seedYesterdayXpDate,
      lastMissionCompletedDate: null,
      lastXpLossCheckDate: todayKey,
    };
    // garante que os orçamentos de hoje/ontem batem com o dia atual
    return normalizeDailyBudgets(seeded, todayKey);
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
    const next = normalizeDailyBudgets(
      {
        ...statsRef.current,
        totalXp: seedTotalXp,
        level: calculateLevelFromXp(seedTotalXp),
        dailyXp: daily.dailyXp,
        dailyXpDate: daily.dailyXpDate,
        yesterdayXp: Math.max(0, seedYesterdayXp),
        yesterdayXpDate: seedYesterdayXpDate,
      },
      todayKey,
    );
    statsRef.current = next;
    setStats(next);
  }, [seedTotalXp, seedDailyXp, seedDailyXpDate, seedYesterdayXp, seedYesterdayXpDate]);

  const commit = useCallback((value: UserStats) => {
    statsRef.current = value;
    setStats(value);
    persistRef.current?.({
      totalXp: value.totalXp,
      level: value.level,
      dailyXp: value.dailyXp,
      dailyXpDate: value.dailyXpDate,
      yesterdayXp: value.yesterdayXp,
      yesterdayXpDate: value.yesterdayXpDate,
    });
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

  /**
   * Conclui uma missão para um dia específico (hoje ou ontem), consumindo o
   * orçamento daquele dia. Usado pelo calendário para marcar missões esquecidas
   * de ontem sem afetar o limite de hoje.
   */
  const completeMissionForDay = useCallback(
    (missionXp: number, targetKey: string) => {
      dirty.current = true;
      const todayKey = getLocalDateKey(new Date());
      const result = applyXpGainForDay(statsRef.current, missionXp, targetKey, todayKey);
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

  /** Reverte uma conclusão de um dia específico (hoje ou ontem). */
  const revertMissionForDay = useCallback(
    (creditedXp: number, targetKey: string) => {
      dirty.current = true;
      const todayKey = getLocalDateKey(new Date());
      const result = applyXpRevertForDay(statsRef.current, creditedXp, targetKey, todayKey);
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

  /**
   * Orçamento de XP usado em um dia (hoje ou ontem) — para a barra de XP do
   * calendário. Dias fora da janela (nem hoje nem ontem) retornam null.
   */
  const dailyForDate = useCallback(
    (dateKey: string): { used: number; limit: number } | null => {
      const todayKey = getLocalDateKey(new Date());
      const kind = dayBudgetKind(dateKey, todayKey);
      if (kind === "today") return { used: stats.dailyXp, limit: DAILY_XP_LIMIT };
      if (kind === "yesterday") {
        // só conta se o orçamento de ontem ainda se refere ao dia anterior
        const used = stats.yesterdayXpDate === previousDateKey(todayKey) ? stats.yesterdayXp : 0;
        return { used, limit: DAILY_XP_LIMIT };
      }
      return null;
    },
    [stats.dailyXp, stats.yesterdayXp, stats.yesterdayXpDate],
  );

  return {
    stats,
    progress,
    daily,
    dailyForDate,
    feedback,
    completeMission,
    revertMission,
    completeMissionForDay,
    revertMissionForDay,
    dismissFeedback,
  };
}
