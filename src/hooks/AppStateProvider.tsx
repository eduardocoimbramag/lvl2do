"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useUserStats } from "./useUserStats";
import { useMissions } from "./useMissions";

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
type AppState = ReturnType<typeof useUserStats> & {
  /** API de missões (lista de hoje, todas, toggle, fail, add, etc.). */
  missionsApi: ReturnType<typeof useMissions>;
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

  const value: AppState = { ...userStats, missionsApi };

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
