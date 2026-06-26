"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { updateMyProfile } from "@/lib/db/profiles";
import { logXpEvent } from "@/lib/db/xpEvents";
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

  // persiste XP/level + contador diário no profile (best-effort, não bloqueia a UI)
  const persistStats = useCallback(
    (totalXp: number, level: number, dailyXp: number, dailyXpDate: string) => {
      updateMyProfile({
        total_xp: totalXp,
        level,
        daily_xp: dailyXp,
        daily_xp_date: dailyXpDate,
      }).catch(() => {});
    },
    [],
  );

  // progressão (XP/level + diário) semeada do banco — conta nova começa em 0.
  const userStats = useUserStats({
    seedTotalXp: profile?.total_xp ?? 0,
    seedDailyXp: profile?.daily_xp ?? 0,
    seedDailyXpDate: profile?.daily_xp_date ?? null,
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
    onMissionCompleted: ({ xp, category, missionId }) => {
      const earned = userStats.completeMission(xp).earnedXp;
      registerCompletion();
      if (userId) {
        logXpEvent({ userId, kind: "gain", amount: earned, category, missionId }).catch(() => {});
      }
      return earned;
    },
    onMissionReverted: ({ xp, category, missionId }) => {
      userStats.revertMission(xp);
      if (userId) {
        logXpEvent({ userId, kind: "revert", amount: -xp, category, missionId }).catch(() => {});
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
