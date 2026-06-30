"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { updateMyProfile } from "@/lib/db/profiles";
import { logXpEvent } from "@/lib/db/xpEvents";
import { getLocalDateKey } from "@/lib/xp-system";

/** ISO de meio-dia local de uma data "YYYY-MM-DD" (evita pular de dia por fuso). */
function noonOf(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}
import { useUserStats } from "./useUserStats";
import { useMissions } from "./useMissions";
import { useStreak } from "./useStreak";
import { useAlarms } from "./useAlarms";
import { useNotifications } from "./useNotifications";

/**
 * Estado global do app (missões + progressão de XP) em uma única instância.
 * O XP/level e as missões são persistidos no Supabase (por usuário); o streak
 * vem do profile. Concluir uma missão credita XP e atualiza todas as telas.
 */
type AlarmsApi = ReturnType<typeof useAlarms> & {
  /** desativa um alarme por id (idempotente). */
  toggleEnabledOff: (id: string) => void;
};

type AppState = ReturnType<typeof useUserStats> & {
  /** streak atual (dias consecutivos), vindo do profile. */
  streak: number;
  /** maior streak já alcançado, vindo do profile. */
  bestStreak: number;
  missionsApi: ReturnType<typeof useMissions>;
  alarmsApi: AlarmsApi;
  notificationsApi: ReturnType<typeof useNotifications>;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const userId = user?.id ?? null;

  // persiste XP/level + contadores diários (hoje e ontem) no profile (best-effort).
  const persistStats = useCallback(
    (s: {
      totalXp: number;
      level: number;
      dailyXp: number;
      dailyXpDate: string;
      yesterdayXp: number;
      yesterdayXpDate: string | null;
    }) => {
      updateMyProfile({
        total_xp: s.totalXp,
        level: s.level,
        daily_xp: s.dailyXp,
        daily_xp_date: s.dailyXpDate,
        yesterday_xp: s.yesterdayXp,
        yesterday_xp_date: s.yesterdayXpDate,
      }).catch(() => {});
    },
    [],
  );

  // progressão (XP/level + diário) semeada do banco — conta nova começa em 0.
  const userStats = useUserStats({
    seedTotalXp: profile?.total_xp ?? 0,
    seedDailyXp: profile?.daily_xp ?? 0,
    seedDailyXpDate: profile?.daily_xp_date ?? null,
    seedYesterdayXp: profile?.yesterday_xp ?? 0,
    seedYesterdayXpDate: profile?.yesterday_xp_date ?? null,
    persistStats,
  });

  // streak (dias consecutivos) semeado do profile e persistido ao concluir.
  const persistStreak = useCallback(
    (current: number, best: number, lastCompletedAtISO: string) => {
      updateMyProfile({
        current_streak: current,
        best_streak: best,
        last_mission_completed_at: lastCompletedAtISO,
      }).catch(() => {});
    },
    [],
  );
  const streakApi = useStreak({
    seedCurrent: profile?.current_streak ?? 0,
    seedBest: profile?.best_streak ?? 0,
    seedLastCompletedAt: profile?.last_mission_completed_at ?? null,
    persist: persistStreak,
  });

  const registerCompletion = streakApi.registerCompletion;

  // missões persistidas no banco; concluir credita XP, avança o streak e
  // registra um evento de XP (para o histórico de métricas).
  const missionsApi = useMissions({
    userId,
    onMissionCompleted: ({ xp, category, missionId, targetDateKey }) => {
      const todayKey = getLocalDateKey(new Date());
      const isRetro = !!targetDateKey && targetDateKey !== todayKey;
      // crédito no orçamento do dia-alvo (ontem) ou de hoje
      const earned = isRetro
        ? userStats.completeMissionForDay(xp, targetDateKey!).earnedXp
        : userStats.completeMission(xp).earnedXp;
      // só conta para o streak quando a conclusão é de hoje
      if (!isRetro) registerCompletion();
      if (userId) {
        logXpEvent({
          userId,
          kind: "gain",
          amount: earned,
          category,
          missionId,
          occurredAt: isRetro ? noonOf(targetDateKey!) : undefined,
        }).catch(() => {});
      }
      return earned;
    },
    onMissionReverted: ({ xp, category, missionId, targetDateKey }) => {
      const todayKey = getLocalDateKey(new Date());
      const isRetro = !!targetDateKey && targetDateKey !== todayKey;
      if (isRetro) userStats.revertMissionForDay(xp, targetDateKey!);
      else userStats.revertMission(xp);
      if (userId) {
        logXpEvent({
          userId,
          kind: "revert",
          amount: -xp,
          category,
          missionId,
          occurredAt: isRetro ? noonOf(targetDateKey!) : undefined,
        }).catch(() => {});
      }
    },
  });

  // alarmes + notificações (estado local por enquanto)
  const alarms = useAlarms();
  const notificationsApi = useNotifications();

  const setEnabled = alarms.setEnabled;
  const toggleEnabledOff = useCallback((id: string) => setEnabled(id, false), [setEnabled]);
  const alarmsApi: AlarmsApi = useMemo(
    () => ({ ...alarms, toggleEnabledOff }),
    [alarms, toggleEnabledOff],
  );

  const value: AppState = {
    ...userStats,
    streak: streakApi.current,
    bestStreak: streakApi.best,
    missionsApi,
    alarmsApi,
    notificationsApi,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

/** Acessa o estado de progressão (XP/level/daily/feedback/streak) global. */
export function useAppStats(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppStats deve ser usado dentro de <AppStateProvider>.");
  }
  return ctx;
}

/** Acessa a API de missões global (mesma instância em todas as páginas). */
export function useAppMissions() {
  return useAppStats().missionsApi;
}

/** Acessa a API de alarmes global (mesma instância em página e scheduler). */
export function useAppAlarms() {
  return useAppStats().alarmsApi;
}

/** Acessa a API de notificações global (compartilhada com a sineta). */
export function useAppNotifications() {
  return useAppStats().notificationsApi;
}
