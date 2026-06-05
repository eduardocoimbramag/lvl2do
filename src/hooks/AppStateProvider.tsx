"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useUserStats } from "./useUserStats";
import { useMissions } from "./useMissions";
import { useAlarms } from "./useAlarms";
import { useNotifications } from "./useNotifications";

/**
 * Estado global do app (missões + progressão de XP), em uma ÚNICA instância
 * compartilhada por todas as páginas internas.
 *
 * Por que Context: antes, cada página chamava `useUserStats`/`useMissions`
 * separadamente, criando estados independentes. Concluir uma missão numa
 * página não refletia em outra (e a aba de Missões nem creditava XP). Com um
 * provider único, concluir uma missão em qualquer lugar credita o mesmo XP e
 * atualiza todas as telas em tempo real.
 */
/** API de alarmes global + atalho para desativar (usado pelo scheduler). */
type AlarmsApi = ReturnType<typeof useAlarms> & {
  /** desativa um alarme por id (idempotente) — atalho de setEnabled(id, false). */
  toggleEnabledOff: (id: string) => void;
};

type AppState = ReturnType<typeof useUserStats> & {
  /** API de missões (lista de hoje, todas, toggle, fail, add, etc.). */
  missionsApi: ReturnType<typeof useMissions>;
  /** API de alarmes (lista, add, update, remove, enable). */
  alarmsApi: AlarmsApi;
  /** API de notificações (compartilhada com a sineta, em tempo real). */
  notificationsApi: ReturnType<typeof useNotifications>;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  // Uma única instância de progressão (XP/level) para todo o app.
  const userStats = useUserStats();

  // Uma única instância de missões; concluir credita XP e desfazer devolve o
  // XP creditado — tudo no mesmo userStats (estado unificado).
  const missionsApi = useMissions({
    onMissionCompleted: (xp) => userStats.completeMission(xp).earnedXp,
    onMissionReverted: (xp) => userStats.revertMission(xp),
  });

  // Alarmes + notificações em instância única (página e scheduler/sineta
  // compartilham o mesmo estado, refletindo em tempo real).
  const alarms = useAlarms();
  const notificationsApi = useNotifications();

  const setEnabled = alarms.setEnabled;
  const toggleEnabledOff = useCallback((id: string) => setEnabled(id, false), [setEnabled]);
  const alarmsApi: AlarmsApi = useMemo(
    () => ({ ...alarms, toggleEnabledOff }),
    [alarms, toggleEnabledOff],
  );

  const value: AppState = { ...userStats, missionsApi, alarmsApi, notificationsApi };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

/** Acessa o estado de progressão (XP/level/daily/feedback) global. */
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
