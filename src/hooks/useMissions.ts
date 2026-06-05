"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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

interface UseMissionsOptions {
  /**
   * Disparado na transição pendente/falhada → concluída de uma missão, com o
   * XP base da missão. Deve retornar o XP EFETIVAMENTE creditado (após o
   * limite diário), para que a reversão devolva o valor exato. A lógica de XP
   * vive fora deste hook (ver useUserStats).
   */
  onMissionCompleted?: (missionXp: number) => number;
  /**
   * Disparado ao DESFAZER uma conclusão (concluída → pendente), com o XP que
   * havia sido creditado naquela missão, para ser devolvido.
   */
  onMissionReverted?: (creditedXp: number) => void;
}

/**
 * Hook de estado local das missões (SEM persistência).
 * Concluir/criar missões altera apenas o estado em memória.
 * FUTURO: substituir por dados do banco (fetch/mutations).
 */
export function useMissions(options: UseMissionsOptions = {}) {
  const [missions, setMissions] = useState<Mission[]>(mockMissions);
  // espelho síncrono das missões (para decidir efeitos de XP fora do updater)
  const missionsRef = useRef<Mission[]>(missions);
  missionsRef.current = missions;
  // mantém os callbacks atuais sem recriar os handlers a cada render
  const onCompletedRef = useRef(options.onMissionCompleted);
  onCompletedRef.current = options.onMissionCompleted;
  const onRevertedRef = useRef(options.onMissionReverted);
  onRevertedRef.current = options.onMissionReverted;
  // XP de fato creditado por missão (para devolver o valor exato ao desfazer)
  const creditedByMission = useRef<Record<string, number>>({});

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

  /**
   * Alterna concluída/pendente.
   * - pendente/falhada → concluída: credita XP e guarda o valor creditado.
   * - concluída → pendente (desfazer): devolve exatamente o XP creditado.
   *
   * A decisão (e o efeito de XP) usa o espelho síncrono `missionsRef`, fora do
   * updater do setState, para não duplicar sob React Strict Mode.
   */
  const toggle = useCallback((id: string) => {
    const target = missionsRef.current.find((m) => m.id === id);
    if (!target) return;
    const isUndo = target.status === "done";

    // aplica a mudança de status
    setMissions((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: m.status === "done" ? "pending" : "done" }
          : m,
      ),
    );

    // efeitos de XP (uma única vez, fora do updater)
    if (!isUndo) {
      // pendente/falhada → concluída: credita e registra o XP concedido
      const credited = onCompletedRef.current?.(target.xp) ?? 0;
      creditedByMission.current[id] = credited;
    } else {
      // concluída → pendente: devolve exatamente o que foi creditado
      const credited = creditedByMission.current[id] ?? 0;
      delete creditedByMission.current[id];
      if (credited > 0) onRevertedRef.current?.(credited);
    }
  }, []);

  /** Marca como não concluída (sem XP). Alterna falhada/pendente. */
  const fail = useCallback((id: string) => setStatus(id, "failed"), [setStatus]);

  /** Adiciona uma missão criada localmente (sem salvar no banco). */
  const addMission = useCallback((mission: Mission) => {
    setMissions((prev) => [{ ...mission, id: `${mission.id}-${prev.length}` }, ...prev]);
  }, []);

  /**
   * Adiciona uma missão JÁ concluída (usado pelo Modo Foco). Cria a missão com
   * status "done" agendada para hoje e credita o XP pelo mesmo caminho das
   * missões normais (respeitando o limite diário), para atualizar nível/barra.
   * Retorna o XP efetivamente creditado.
   */
  const addCompletedMission = useCallback(
    (input: { title: string; category: Mission["category"]; xp: number; shift?: Mission["shift"] }) => {
      const id = `focus-${Date.now()}`;
      const mission: Mission = {
        id,
        title: input.title,
        category: input.category,
        difficulty: "Média",
        shift: input.shift ?? "Tarde",
        status: "done",
        xp: input.xp,
        schedule: { type: "today" },
      };
      setMissions((prev) => [mission, ...prev]);
      // credita o XP fora do updater (mesma estratégia do toggle)
      const credited = onCompletedRef.current?.(input.xp) ?? 0;
      creditedByMission.current[id] = credited;
      return credited;
    },
    [],
  );

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
    addCompletedMission,
    updateSchedule,
    removeMission,
    stats,
  };
}
