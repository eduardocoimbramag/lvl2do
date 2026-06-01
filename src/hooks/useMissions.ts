"use client";

import { useCallback, useMemo, useState } from "react";
import { mockMissions } from "@/data/mockMissions";
import type { Mission } from "@/data/types";

/**
 * Hook de estado local das missões (SEM persistência).
 * Concluir/criar missões altera apenas o estado em memória.
 * FUTURO: substituir por dados do banco (fetch/mutations).
 */
export function useMissions() {
  const [missions, setMissions] = useState<Mission[]>(mockMissions);

  /** Alterna status concluída/pendente apenas visualmente. */
  const toggle = useCallback((id: string) => {
    setMissions((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: m.status === "done" ? "pending" : "done" }
          : m,
      ),
    );
  }, []);

  /** Adiciona uma missão criada localmente (sem salvar no banco). */
  const addMission = useCallback((mission: Mission) => {
    setMissions((prev) => [{ ...mission, id: `${mission.id}-${prev.length}` }, ...prev]);
  }, []);

  const stats = useMemo(() => {
    const done = missions.filter((m) => m.status === "done");
    return {
      total: missions.length,
      done: done.length,
      xpEarned: done.reduce((sum, m) => sum + m.xp, 0),
    };
  }, [missions]);

  return { missions, toggle, addMission, stats };
}
