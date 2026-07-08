"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyXpGain,
  applyXpRevert,
  applyXpGainForDay,
  applyXpRevertForDay,
  applyInactiveDayLoss,
  normalizeDailyBudgets,
  previousDateKey,
  dayBudgetKind,
  daysBetweenDateKeys,
  calculateCurrentLevelProgress,
  calculateLevelFromXp,
  getLocalDateKey,
  DAILY_XP_LIMIT,
  type UserStats,
  type XpGainResult,
  type XpRevertResult,
} from "@/lib/xp-system";

/** Feedback exibido ao usuário após concluir/desfazer uma missão (ou perder XP). */
export type StatsFeedback = {
  kind: "gain" | "revert" | "loss";
  /** XP creditado (gain) ou removido como número negativo (revert/loss). */
  xp: number;
  baseXp?: number;
  wasCapped?: boolean;
  reachedDailyLimit?: boolean;
  /** dias inativos que geraram a perda (kind "loss"). */
  inactiveDays?: number;
  levelDelta: number;
  level: number;
};

/** Converte um timestamp ISO em chave de data local "YYYY-MM-DD" (ou null). */
function isoToDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : getLocalDateKey(d);
}

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
  /**
   * Chave do dia atual como ESTADO (ver useTodayKey). Quando muda com o app
   * aberto (virada de meia-noite), os orçamentos são re-normalizados e
   * persistidos, e a checagem de inatividade roda de novo (auditoria A1/A2).
   */
  todayKey?: string;
  /** `last_mission_completed_at` (ISO) do profile — base da inatividade. */
  seedLastCompletedAt?: string | null;
  /** `last_xp_loss_check_date` ("YYYY-MM-DD") do profile, ou null. */
  seedLossCheckDate?: string | null;
  /**
   * Habilita a perda de XP por inatividade. Só deve ser true quando a coluna
   * `last_xp_loss_check_date` EXISTE no banco (senão a perda se repetiria a
   * cada reload por falta de persistência da marca de checagem).
   */
  inactivityEnabled?: boolean;
  /** persiste XP/level + contadores diários no banco (best-effort). */
  persistStats?: (snapshot: {
    totalXp: number;
    level: number;
    dailyXp: number;
    dailyXpDate: string;
    yesterdayXp: number;
    yesterdayXpDate: string | null;
    lastXpLossCheckDate: string | null;
  }) => void;
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
  todayKey: todayKeyProp,
  seedLastCompletedAt = null,
  seedLossCheckDate = null,
  inactivityEnabled = false,
  persistStats,
}: UseUserStatsOptions) {
  const [stats, setStats] = useState<UserStats>(() => {
    const todayKey = getLocalDateKey(new Date());
    // valores CRUS do banco — a normalização decide migração/zeragem de dia.
    const seeded: UserStats = {
      totalXp: seedTotalXp,
      level: calculateLevelFromXp(seedTotalXp),
      dailyXp: Math.max(0, seedDailyXp),
      dailyXpDate: seedDailyXpDate ?? todayKey,
      yesterdayXp: Math.max(0, seedYesterdayXp),
      yesterdayXpDate: seedYesterdayXpDate,
      lastMissionCompletedDate: isoToDateKey(seedLastCompletedAt),
      lastXpLossCheckDate: seedLossCheckDate,
    };
    // migra daily→yesterday na virada e alinha os orçamentos ao dia atual
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
    // valores CRUS do banco (sem pré-zerar) para a normalização poder migrar
    const next = normalizeDailyBudgets(
      {
        ...statsRef.current,
        totalXp: seedTotalXp,
        level: calculateLevelFromXp(seedTotalXp),
        dailyXp: Math.max(0, seedDailyXp),
        dailyXpDate: seedDailyXpDate ?? todayKey,
        yesterdayXp: Math.max(0, seedYesterdayXp),
        yesterdayXpDate: seedYesterdayXpDate,
        lastMissionCompletedDate: isoToDateKey(seedLastCompletedAt),
        lastXpLossCheckDate: seedLossCheckDate,
      },
      todayKey,
    );
    statsRef.current = next;
    setStats(next);

    // Se a virada do dia migrou/zerou orçamentos (o resultado difere do banco),
    // persiste UMA vez — senão, ao abrir em D+1 sem concluir nada, a migração
    // se perderia (o commit só dispara ao concluir/desfazer). Não marca dirty.
    const changed =
      next.dailyXp !== seedDailyXp ||
      next.dailyXpDate !== seedDailyXpDate ||
      next.yesterdayXp !== seedYesterdayXp ||
      next.yesterdayXpDate !== seedYesterdayXpDate;
    if (changed) {
      persistRef.current?.({
        totalXp: next.totalXp,
        level: next.level,
        dailyXp: next.dailyXp,
        dailyXpDate: next.dailyXpDate,
        yesterdayXp: next.yesterdayXp,
        yesterdayXpDate: next.yesterdayXpDate,
        lastXpLossCheckDate: next.lastXpLossCheckDate,
      });
    }
  }, [
    seedTotalXp,
    seedDailyXp,
    seedDailyXpDate,
    seedYesterdayXp,
    seedYesterdayXpDate,
    seedLastCompletedAt,
    seedLossCheckDate,
  ]);

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
      lastXpLossCheckDate: value.lastXpLossCheckDate,
    });
  }, []);

  /**
   * VIRADA DE DIA com o app aberto (auditoria A2): quando o `todayKey` (day
   * tick) muda, re-normaliza os orçamentos (migra dailyXp→yesterdayXp) e
   * persiste — mesmo em sessão "dirty", pois a normalização é idempotente e
   * não perde ganhos locais. No mount é no-op (o seed já normalizou).
   */
  useEffect(() => {
    if (!todayKeyProp) return;
    const cur = statsRef.current;
    const next = normalizeDailyBudgets(cur, todayKeyProp);
    const changed =
      next.dailyXp !== cur.dailyXp ||
      next.dailyXpDate !== cur.dailyXpDate ||
      next.yesterdayXp !== cur.yesterdayXp ||
      next.yesterdayXpDate !== cur.yesterdayXpDate;
    if (changed) commit(next);
  }, [todayKeyProp, commit]);

  /**
   * PERDA POR INATIVIDADE (auditoria A3): aplica −200 XP por dia inteiro sem
   * conclusão, uma única vez por dia (marca `lastXpLossCheckDate` persistida).
   * Só roda com `inactivityEnabled` (coluna existente no banco) — sem a marca
   * persistida, a perda se repetiria a cada reload.
   */
  const inactivityDoneFor = useRef<string | null>(null);
  useEffect(() => {
    if (!inactivityEnabled) return;
    const tk = todayKeyProp ?? getLocalDateKey(new Date());
    if (inactivityDoneFor.current === tk) return;

    // última atividade: a maior entre o seed do banco e a da sessão atual
    const seedKey = isoToDateKey(seedLastCompletedAt);
    const sessionKey = statsRef.current.lastMissionCompletedDate;
    const lastActivity =
      seedKey && sessionKey ? (seedKey > sessionKey ? seedKey : sessionKey) : (seedKey ?? sessionKey);
    // nunca concluiu nada → não há ponto de partida para contar perda
    if (!lastActivity) {
      inactivityDoneFor.current = tk;
      return;
    }

    // "pago até": o dia da última atividade OU o dia anterior à última checagem
    // (na checagem do dia X penalizamos até X−1) — o que for mais recente.
    const checked = seedLossCheckDate ?? statsRef.current.lastXpLossCheckDate;
    const checkedPaid = checked ? previousDateKey(checked) : null;
    const paidThrough = checkedPaid && checkedPaid > lastActivity ? checkedPaid : lastActivity;

    // dias inteiros SEM atividade entre paidThrough (excl.) e hoje (excl.)
    const unprocessed = Math.max(0, daysBetweenDateKeys(paidThrough, tk) - 1);
    inactivityDoneFor.current = tk;
    if (unprocessed <= 0) return;

    const result = applyInactiveDayLoss(statsRef.current, unprocessed);
    dirty.current = true; // o estado local vira a verdade a partir daqui
    commit({ ...result.stats, lastXpLossCheckDate: tk });

    if (result.xpLost > 0) {
      setFeedback({
        kind: "loss",
        xp: -result.xpLost,
        inactiveDays: result.inactiveDays,
        levelDelta: -result.levelDrop,
        level: result.levelAfter,
      });
    }
  }, [inactivityEnabled, seedLastCompletedAt, seedLossCheckDate, todayKeyProp, commit]);

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
