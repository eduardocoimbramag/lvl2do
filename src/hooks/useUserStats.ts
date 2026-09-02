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
  INACTIVITY_LOSS_ENABLED,
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
  /**
   * As sementes vieram MESMO do banco (profile carregado)?
   *
   * Enquanto for false, este hook NUNCA escreve no banco. Sem essa trava, o
   * primeiro render — em que `profile` ainda é null e todas as sementes valem
   * 0/null — gravava `total_xp = 0` por cima do XP real do usuário, a cada
   * carregamento de página. Ver docs/auditoriaxp.md.
   */
  seedReady?: boolean;
  /**
   * Persiste SOMENTE os orçamentos diários (hoje/ontem).
   *
   * Canal separado de propósito: a migração de virada de dia não tem motivo
   * para carregar `total_xp` junto, e foi exatamente esse acoplamento que
   * transformou uma normalização de orçamento numa zeragem de XP.
   */
  persistDailyBudgets?: (snapshot: {
    dailyXp: number;
    dailyXpDate: string;
    yesterdayXp: number;
    yesterdayXpDate: string | null;
    lastXpLossCheckDate: string | null;
  }) => void;
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
  seedReady = false,
  persistDailyBudgets,
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
  const persistBudgetsRef = useRef(persistDailyBudgets);
  persistBudgetsRef.current = persistDailyBudgets;
  // trava única de escrita: nada sai deste hook para o banco antes de o
  // profile ter carregado. É a correção central de docs/auditoriaxp.md.
  const seedReadyRef = useRef(seedReady);
  seedReadyRef.current = seedReady;

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

    // NUNCA persistir com semente vazia. Antes de o profile carregar, todos os
    // seeds valem 0/null e `changed` é verdadeiro incondicionalmente (as datas
    // normalizadas nunca são null) — o que gravava total_xp = 0 no banco.
    if (!seedReady) return;

    // Se a virada do dia migrou/zerou orçamentos (o resultado difere do banco),
    // persiste UMA vez — senão, ao abrir em D+1 sem concluir nada, a migração
    // se perderia (o commit só dispara ao concluir/desfazer). Não marca dirty.
    const changed =
      next.dailyXp !== seedDailyXp ||
      next.dailyXpDate !== seedDailyXpDate ||
      next.yesterdayXp !== seedYesterdayXp ||
      next.yesterdayXpDate !== seedYesterdayXpDate;
    if (changed) {
      // canal de ORÇAMENTO: não carrega total_xp nem level
      persistBudgetsRef.current?.({
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
    seedReady,
  ]);

  const commit = useCallback((value: UserStats) => {
    statsRef.current = value;
    setStats(value);
    // Mesma trava do efeito de re-semeadura: sem profile carregado, o que
    // houver em memória não é verdade e não pode ir para o banco.
    if (!seedReadyRef.current) return;
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

  /** Atualiza o estado e persiste SÓ os orçamentos (sem tocar em total_xp). */
  const commitBudgets = useCallback((value: UserStats) => {
    statsRef.current = value;
    setStats(value);
    if (!seedReadyRef.current) return;
    persistBudgetsRef.current?.({
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
   *
   * Persiste pelo canal de ORÇAMENTO: migrar o contador do dia não é motivo
   * para reescrever o total de XP.
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
    if (changed) commitBudgets(next);
  }, [todayKeyProp, commitBudgets]);

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

    // ⏸️ perda PAUSADA globalmente enquanto o sistema de XP estabiliza —
    // apenas detecta e avisa, sem reduzir XP (ver INACTIVITY_LOSS_ENABLED).
    if (!INACTIVITY_LOSS_ENABLED) {
      console.warn(
        `[inatividade] ${unprocessed} dia(s) inativo(s) detectado(s) — perda de XP PAUSADA (nenhum XP foi reduzido).`,
      );
      return;
    }

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

  /**
   * Adota o snapshot do PROFILE retornado por uma RPC atômica como o novo
   * estado local (servidor = fonte de verdade). NÃO re-persiste (o servidor já
   * gravou na mesma transação). Marca `dirty` para o próximo re-seed não
   * regredir o estado com uma leitura mais antiga em trânsito.
   * Retorna o nível antes/depois (para o toast calcular level up/down).
   */
  const adoptServerProfile = useCallback(
    (p: {
      total_xp: number;
      daily_xp: number;
      daily_xp_date: string | null;
      yesterday_xp?: number | null;
      yesterday_xp_date?: string | null;
      last_xp_loss_check_date?: string | null;
    }): { levelBefore: number; levelAfter: number } => {
      const levelBefore = statsRef.current.level;
      const todayKey = getLocalDateKey(new Date());
      const next = normalizeDailyBudgets(
        {
          ...statsRef.current,
          totalXp: Math.max(0, p.total_xp),
          level: calculateLevelFromXp(p.total_xp),
          dailyXp: Math.max(0, p.daily_xp ?? 0),
          dailyXpDate: p.daily_xp_date ?? todayKey,
          yesterdayXp: Math.max(0, p.yesterday_xp ?? 0),
          yesterdayXpDate: p.yesterday_xp_date ?? null,
          lastXpLossCheckDate: p.last_xp_loss_check_date ?? statsRef.current.lastXpLossCheckDate,
        },
        todayKey,
      );
      dirty.current = true;
      statsRef.current = next;
      setStats(next);
      return { levelBefore, levelAfter: next.level };
    },
    [],
  );

  /** Exibe um feedback (toast) calculado externamente (ex.: retorno de RPC). */
  const showFeedback = useCallback((fb: StatsFeedback) => setFeedback(fb), []);

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
    adoptServerProfile,
    showFeedback,
    dismissFeedback,
  };
}
