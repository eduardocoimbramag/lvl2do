"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getMissions,
  createMission,
  updateMissionStatus,
  updateMissionSchedule,
  deleteMission,
} from "@/lib/db/missions";
import {
  SHIFTS,
  isScheduledOn,
  toISODate,
  type Mission,
  type MissionSchedule,
  type MissionStatus,
  type Weekday,
} from "@/data/types";
import type { MissionRow } from "@/types/database";

/** Peso de ordenação por status: ativas primeiro, concluídas, falhadas por último. */
const STATUS_ORDER: Record<MissionStatus, number> = { pending: 0, done: 1, failed: 2 };
const SHIFT_ORDER = Object.fromEntries(SHIFTS.map((s, i) => [s, i]));

function sortMissions(missions: Mission[]): Mission[] {
  return [...missions].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return SHIFT_ORDER[a.shift] - SHIFT_ORDER[b.shift];
  });
}

export function occursOn(mission: Mission, date: Date): boolean {
  if (mission.schedule.type === "today") {
    return toISODate(date) === toISODate(new Date());
  }
  return isScheduledOn(mission.schedule, date);
}

/** Linha do banco → Mission do app. */
function rowToMission(r: MissionRow): Mission {
  const schedule: MissionSchedule =
    r.schedule_type === "weekly"
      ? { type: "weekly", weekdays: (r.schedule_weekdays ?? []) as Weekday[] }
      : r.schedule_type === "dates"
        ? { type: "dates", dates: r.schedule_dates ?? [] }
        : { type: "today" };

  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    category: r.category,
    difficulty: r.difficulty,
    shift: r.shift,
    status: r.status,
    xp: r.xp,
    schedule,
  };
}

/** Mission.schedule → colunas do banco. */
function scheduleParts(s: MissionSchedule) {
  return {
    scheduleType: s.type,
    scheduleWeekdays: s.type === "weekly" ? s.weekdays : [],
    scheduleDates: s.type === "dates" ? s.dates : [],
  };
}

/** Contexto de uma conclusão/reversão (para creditar XP e logar evento). */
export interface MissionXpContext {
  /** XP base da missão (gain) ou XP creditado a devolver (revert). */
  xp: number;
  category: Mission["category"];
  /** id da missão (ausente em missões de foco ainda não persistidas). */
  missionId?: string;
}

interface UseMissionsOptions {
  /** id do usuário logado (Supabase). null = sem dados. */
  userId: string | null;
  /** transição → concluída: recebe o contexto e retorna o XP creditado. */
  onMissionCompleted?: (ctx: MissionXpContext) => number;
  /** desfazer conclusão: recebe o contexto (xp = creditado a devolver). */
  onMissionReverted?: (ctx: MissionXpContext) => void;
}

/**
 * Missões persistidas no Supabase. Carrega as do usuário na montagem e
 * cria/conclui/edita/remove no banco (com atualização otimista da UI).
 */
export function useMissions({ userId, onMissionCompleted, onMissionReverted }: UseMissionsOptions) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const missionsRef = useRef<Mission[]>(missions);
  missionsRef.current = missions;
  const onCompletedRef = useRef(onMissionCompleted);
  onCompletedRef.current = onMissionCompleted;
  const onRevertedRef = useRef(onMissionReverted);
  onRevertedRef.current = onMissionReverted;
  const creditedByMission = useRef<Record<string, number>>({});

  // carrega as missões do usuário
  useEffect(() => {
    if (!userId) {
      setMissions([]);
      return;
    }
    let active = true;
    getMissions()
      .then((rows) => {
        if (active) setMissions(((rows ?? []) as MissionRow[]).map(rowToMission));
      })
      .catch((e) => console.error("Erro ao carregar missões:", e));
    return () => {
      active = false;
    };
  }, [userId]);

  /** Alterna concluída/pendente, creditando/devolvendo XP. */
  const toggle = useCallback((id: string) => {
    const target = missionsRef.current.find((m) => m.id === id);
    if (!target) return;
    const isUndo = target.status === "done";
    const newStatus: MissionStatus = isUndo ? "pending" : "done";

    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m)));
    updateMissionStatus(id, newStatus).catch((e) => console.error(e));

    if (!isUndo) {
      const credited =
        onCompletedRef.current?.({ xp: target.xp, category: target.category, missionId: id }) ?? 0;
      creditedByMission.current[id] = credited;
    } else {
      const credited = creditedByMission.current[id] ?? 0;
      delete creditedByMission.current[id];
      if (credited > 0) {
        onRevertedRef.current?.({ xp: credited, category: target.category, missionId: id });
      }
    }
  }, []);

  /** Marca como falhada/pendente (sem XP). */
  const fail = useCallback((id: string) => {
    const target = missionsRef.current.find((m) => m.id === id);
    if (!target) return;
    const newStatus: MissionStatus = target.status === "failed" ? "pending" : "failed";
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m)));
    updateMissionStatus(id, newStatus).catch((e) => console.error(e));
  }, []);

  /** Cria uma missão no banco e adiciona à lista. */
  const addMission = useCallback(
    async (mission: Mission) => {
      if (!userId) return;
      try {
        const row = await createMission({
          userId,
          title: mission.title,
          description: mission.description,
          category: mission.category,
          difficulty: mission.difficulty,
          shift: mission.shift,
          xp: mission.xp,
          ...scheduleParts(mission.schedule),
        });
        setMissions((prev) => [rowToMission(row as MissionRow), ...prev]);
      } catch (e) {
        console.error("Erro ao criar missão:", e);
      }
    },
    [userId],
  );

  /**
   * Adiciona uma missão JÁ concluída (Modo Foco). Credita o XP de forma
   * síncrona (retorna o creditado) e persiste no banco em segundo plano.
   */
  const addCompletedMission = useCallback(
    (input: { title: string; category: Mission["category"]; xp: number; shift?: Mission["shift"] }) => {
      const credited = onCompletedRef.current?.({ xp: input.xp, category: input.category }) ?? 0;
      const tempId = `focus-${Date.now()}`;
      const optimistic: Mission = {
        id: tempId,
        title: input.title,
        category: input.category,
        difficulty: "Média",
        shift: input.shift ?? "Tarde",
        status: "done",
        xp: input.xp,
        schedule: { type: "today" },
      };
      setMissions((prev) => [optimistic, ...prev]);
      creditedByMission.current[tempId] = credited;

      if (userId) {
        (async () => {
          try {
            const row = await createMission({
              userId,
              title: input.title,
              category: input.category,
              difficulty: "Média",
              shift: input.shift ?? "Tarde",
              xp: input.xp,
              scheduleType: "today",
              scheduleWeekdays: [],
              scheduleDates: [],
            });
            await updateMissionStatus(row.id, "done");
            setMissions((prev) =>
              prev.map((m) => (m.id === tempId ? rowToMission({ ...(row as MissionRow), status: "done" }) : m)),
            );
            creditedByMission.current[row.id] = credited;
            delete creditedByMission.current[tempId];
          } catch (e) {
            console.error("Erro ao registrar missão de foco:", e);
          }
        })();
      }

      return credited;
    },
    [userId],
  );

  /** Atualiza a regra de agendamento de uma missão. */
  const updateSchedule = useCallback((id: string, schedule: MissionSchedule) => {
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, schedule } : m)));
    const parts = scheduleParts(schedule);
    updateMissionSchedule(id, parts.scheduleType, parts.scheduleWeekdays, parts.scheduleDates).catch(
      (e) => console.error(e),
    );
  }, []);

  /** Remove a missão do banco e da lista. */
  const removeMission = useCallback((id: string) => {
    setMissions((prev) => prev.filter((m) => m.id !== id));
    deleteMission(id).catch((e) => console.error(e));
  }, []);

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
    missions: todayMissions,
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
