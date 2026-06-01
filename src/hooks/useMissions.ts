"use client";

import { useCallback, useMemo, useState } from "react";
import { mockMissions } from "@/data/mockMissions";
import {
  SHIFTS,
  isScheduledOn,
  toISODate,
  type Mission,
  type MissionSchedule,
  type MissionStatus,
} from "@/data/types";

/** Peso de ordenação por status: ativas primeiro, concluídas, falhadas por último. */
const STATUS_ORDER: Record<MissionStatus, number> = {
  pending: 0,
  done: 1,
  failed: 2,
};

/** Peso de ordenação por turno (Manhã → Tarde → Noite). */
const SHIFT_ORDER = Object.fromEntries(SHIFTS.map((s, i) => [s, i]));

/** Ordena: ativas (por turno) no topo, depois concluídas, depois falhadas. */
function sortMissions(missions: Mission[]): Mission[] {
  return [...missions].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return SHIFT_ORDER[a.shift] - SHIFT_ORDER[b.shift];
  });
}

/**
 * Diz se uma missão ocorre num dia específico, considerando sua regra.
 * `today` ocorre apenas no dia atual; `weekly`/`dates` seguem a regra.
 */
export function occursOn(mission: Mission, date: Date): boolean {
  if (mission.schedule.type === "today") {
    return toISODate(date) === toISODate(new Date());
  }
  return isScheduledOn(mission.schedule, date);
}

/**
 * Hook de estado local das missões (SEM persistência).
 * Concluir/criar missões altera apenas o estado em memória.
 * FUTURO: substituir por dados do banco (fetch/mutations).
 */
export function useMissions() {
  const [missions, setMissions] = useState<Mission[]>(mockMissions);

  /** Define o status, permitindo desfazer ao clicar de novo no mesmo botão. */
  const setStatus = useCallback((id: string, target: Exclude<MissionStatus, "pending">) => {
    setMissions((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: m.status === target ? "pending" : target }
          : m,
      ),
    );
  }, []);

  /** Conclui a missão (ganha XP). Alterna concluída/pendente. */
  const toggle = useCallback((id: string) => setStatus(id, "done"), [setStatus]);

  /** Marca como não concluída (sem XP). Alterna falhada/pendente. */
  const fail = useCallback((id: string) => setStatus(id, "failed"), [setStatus]);

  /** Adiciona uma missão criada localmente (sem salvar no banco). */
  const addMission = useCallback((mission: Mission) => {
    setMissions((prev) => [{ ...mission, id: `${mission.id}-${prev.length}` }, ...prev]);
  }, []);

  /** Atualiza a regra de agendamento de uma missão (ex.: editar dias/datas). */
  const updateSchedule = useCallback((id: string, schedule: MissionSchedule) => {
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, schedule } : m)));
  }, []);

  /** Remove a missão por completo (some de hoje, futuras e pré-configuradas). */
  const removeMission = useCallback((id: string) => {
    setMissions((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Missões que ocorrem HOJE (para as 3 colunas), ordenadas.
  const todayMissions = useMemo(() => {
    const now = new Date();
    return sortMissions(missions.filter((m) => occursOn(m, now)));
  }, [missions]);

  const stats = useMemo(() => {
    const done = todayMissions.filter((m) => m.status === "done");
    return {
      total: todayMissions.length,
      done: done.length,
      xpEarned: done.reduce((sum, m) => sum + m.xp, 0),
    };
  }, [todayMissions]);

  return {
    /** Missões de hoje (filtradas + ordenadas) — usadas nas colunas. */
    missions: todayMissions,
    /** Todas as missões (incl. futuras) — usadas pelas abas de futuras/pré-configuradas. */
    allMissions: missions,
    toggle,
    fail,
    addMission,
    updateSchedule,
    removeMission,
    stats,
  };
}
