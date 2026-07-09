"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getMissions,
  createMission,
  updateMissionStatus,
  updateMissionSchedule,
  updateMissionFull,
  deleteMission,
} from "@/lib/db/missions";
import {
  completeMissionAtomic,
  revertMissionAtomic,
  getActiveCompletions,
} from "@/lib/db/missionCompletions";
import type { ProfileRow } from "@/types/database";
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
    // "Hoje" ocorre APENAS no dia em que a missão foi criada. Sem createdAt
    // (mocks antigos), cai para o dia atual como comportamento anterior.
    const created = mission.createdAt ? new Date(mission.createdAt) : new Date();
    return toISODate(date) === toISODate(created);
  }
  return isScheduledOn(mission.schedule, date);
}

/**
 * Missão recorrente = repete em vários dias (semanal ou datas específicas).
 * A conclusão de recorrentes é rastreada POR DIA (mapa retroativo), para que
 * ao virar o dia elas voltem a "não concluída" automaticamente — sem depender
 * do único campo `status` global do banco.
 */
export function isRecurring(mission: Mission): boolean {
  return mission.schedule.type === "weekly" || mission.schedule.type === "dates";
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
    createdAt: r.created_at,
    completedAt: r.completed_at ?? undefined,
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

interface UseMissionsOptions {
  /** id do usuário logado (Supabase). null = sem dados. */
  userId: string | null;
  /** chave do dia atual como estado (day tick) — re-deriva "hoje" na virada. */
  todayKey?: string;
  /**
   * Chamado após uma RPC atômica bem-sucedida, com o PROFILE já atualizado
   * pelo servidor. O provider adota o snapshot (XP/level/orçamentos/streak) e
   * exibe o toast. `xp` = creditado (complete) ou devolvido (revert).
   */
  onServerUpdate?: (u: {
    kind: "complete" | "revert";
    profile: ProfileRow;
    xp: number;
    baseXp?: number;
    dateKey: string;
    category: Mission["category"];
  }) => void;
  /** falha de RPC (a UI deve avisar; o estado local NÃO muda). */
  onRpcError?: (message: string) => void;
}

/**
 * Missões persistidas no Supabase.
 *
 * CONCLUSÃO/REVERSÃO são ATÔMICAS no servidor (complete_mission_atomic /
 * revert_mission_atomic — ver supabase/2026-mission-completions.sql):
 * mission_completions + XP/level/streak no profile + status + xp_events na
 * MESMA transação. O cliente apenas reflete o retorno da RPC — localStorage
 * NÃO é mais fonte de verdade para XP/crédito.
 */
export function useMissions({ userId, todayKey, onServerUpdate, onRpcError }: UseMissionsOptions) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const missionsRef = useRef<Mission[]>(missions);
  missionsRef.current = missions;
  const onServerUpdateRef = useRef(onServerUpdate);
  onServerUpdateRef.current = onServerUpdate;
  const onRpcErrorRef = useRef(onRpcError);
  onRpcErrorRef.current = onRpcError;

  /**
   * Conclusões ATIVAS por (missão, dia) — chave `${missionId}@${YYYY-MM-DD}` →
   * XP creditado. FONTE: banco (mission_completions), hidratado no load e
   * atualizado com o retorno das RPCs. Sincroniza entre dispositivos e
   * substitui os antigos mapas de localStorage (retroCompletions/creditedXp).
   */
  const [completions, setCompletions] = useState<Record<string, number>>({});
  const completionsRef = useRef<Record<string, number>>(completions);
  completionsRef.current = completions;

  useEffect(() => {
    if (!userId) {
      setCompletions({});
      return;
    }
    let active = true;
    getActiveCompletions()
      .then((rows) => {
        if (!active) return;
        const map: Record<string, number> = {};
        for (const r of rows) map[`${r.mission_id}@${r.completed_for_date}`] = r.credited_xp;
        setCompletions(map);
      })
      .catch((e) => console.warn("[missions] falha ao carregar conclusões do banco:", e));
    return () => {
      active = false;
    };
  }, [userId]);

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

  /** Chave de conclusão por-dia (missão + dia). */
  const completionKeyOf = (id: string, dateKey: string) => `${id}@${dateKey}`;

  /**
   * CONCLUI a missão para um dia via RPC ATÔMICA. O estado local só muda com o
   * RETORNO do servidor — se a RPC falhar, nada muda na UI (impossível ficar
   * "concluída sem XP"). Duplo crédito é bloqueado no banco (índice único).
   */
  const completeForDay = useCallback(async (id: string, dateKey: string) => {
    const target = missionsRef.current.find((m) => m.id === id);
    if (!target) return;
    try {
      const res = await completeMissionAtomic(id, dateKey);
      setCompletions((prev) => ({
        ...prev,
        [completionKeyOf(id, res.completed_for_date)]: res.credited_xp,
      }));
      if (res.mission) {
        const updated = rowToMission(res.mission);
        setMissions((prev) => prev.map((m) => (m.id === id ? updated : m)));
      }
      onServerUpdateRef.current?.({
        kind: "complete",
        profile: res.profile,
        xp: res.credited_xp,
        baseXp: target.xp,
        dateKey: res.completed_for_date,
        category: target.category,
      });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? "");
      if (msg.includes("duplicate_completion")) {
        // tentativa de duplo crédito — o servidor bloqueou; sincroniza exibição
        console.warn("[missions] duplo crédito bloqueado pelo servidor:", { id, dateKey });
        setCompletions((prev) =>
          completionKeyOf(id, dateKey) in prev
            ? prev
            : { ...prev, [completionKeyOf(id, dateKey)]: 0 },
        );
        return;
      }
      console.error("[missions] complete_mission_atomic FALHOU — missão NÃO marcada:", e);
      onRpcErrorRef.current?.(
        "Não foi possível concluir a missão. Verifique a conexão e tente novamente.",
      );
    }
  }, []);

  /**
   * DESFAZ a conclusão via RPC ATÔMICA — devolve EXATAMENTE o XP creditado
   * (registrado em mission_completions), no orçamento do dia da conclusão.
   */
  const revertForDay = useCallback(async (id: string, dateKey?: string) => {
    const target = missionsRef.current.find((m) => m.id === id);
    if (!target) return;
    try {
      const res = await revertMissionAtomic(id, dateKey);
      setCompletions((prev) => {
        const next = { ...prev };
        delete next[completionKeyOf(id, res.completed_for_date)];
        return next;
      });
      if (res.mission) {
        const updated = rowToMission(res.mission);
        setMissions((prev) => prev.map((m) => (m.id === id ? updated : m)));
      }
      onServerUpdateRef.current?.({
        kind: "revert",
        profile: res.profile,
        xp: res.reverted_xp,
        dateKey: res.completed_for_date,
        category: target.category,
      });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? "");
      if (msg.includes("completion_not_found")) {
        console.warn("[missions] reversão sem conclusão ativa no servidor (dessincronizado):", {
          id,
          dateKey,
        });
        onRpcErrorRef.current?.("Conclusão não encontrada no servidor. Recarregue a página.");
        return;
      }
      console.error("[missions] revert_mission_atomic FALHOU — estado NÃO alterado:", e);
      onRpcErrorRef.current?.("Não foi possível desfazer a missão. Tente novamente.");
    }
  }, []);

  /** Uma (missão, dia) tem conclusão ativa no servidor? */
  const isCompletedForDay = useCallback(
    (id: string, dateKey: string) => completionKeyOf(id, dateKey) in completionsRef.current,
    [],
  );

  /**
   * A missão está concluída NAQUELE dia? Regra unificada de exibição:
   * - recorrente → conclusão por-dia (mission_completions);
   * - "uma vez"/foco → status global (só ocorre no dia dela).
   */
  const isDoneForDay = useCallback(
    (mission: Mission, dateKey: string) =>
      isRecurring(mission)
        ? completionKeyOf(mission.id, dateKey) in completionsRef.current
        : mission.status === "done",
    [],
  );

  /** Alterna concluída/pendente para HOJE (botão do card). */
  const toggle = useCallback(
    (id: string) => {
      const target = missionsRef.current.find((m) => m.id === id);
      if (!target) return;
      const tk = todayKey ?? toISODate(new Date());
      if (isDoneForDay(target, tk)) {
        // "uma vez": o servidor localiza a conclusão ativa mais recente;
        // recorrente: desfaz exatamente a de hoje.
        void revertForDay(id, isRecurring(target) ? tk : undefined);
      } else {
        void completeForDay(id, tk);
      }
    },
    [todayKey, isDoneForDay, revertForDay, completeForDay],
  );

  /** Conclui/desfaz para um DIA específico (calendário: hoje/ontem). */
  const toggleForDay = useCallback(
    (id: string, dateKey: string) => {
      const target = missionsRef.current.find((m) => m.id === id);
      if (!target) return;
      if (isDoneForDay(target, dateKey)) void revertForDay(id, dateKey);
      else void completeForDay(id, dateKey);
    },
    [isDoneForDay, revertForDay, completeForDay],
  );

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
   * Modo Foco: cria a missão e a conclui ATOMICAMENTE (RPC). Retorna o XP
   * efetivamente creditado (0 em falha — a UI é avisada via onRpcError).
   * Sem otimismo: o estado local só muda com o retorno do servidor.
   */
  const addCompletedMission = useCallback(
    async (input: {
      title: string;
      category: Mission["category"];
      xp: number;
      shift?: Mission["shift"];
    }): Promise<number> => {
      if (!userId) return 0;
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
        const res = await completeMissionAtomic(row.id, toISODate(new Date()));
        const missionRow = (res.mission ?? row) as MissionRow;
        setMissions((prev) => [rowToMission(missionRow), ...prev]);
        setCompletions((prev) => ({
          ...prev,
          [`${row.id}@${res.completed_for_date}`]: res.credited_xp,
        }));
        onServerUpdateRef.current?.({
          kind: "complete",
          profile: res.profile,
          xp: res.credited_xp,
          baseXp: input.xp,
          dateKey: res.completed_for_date,
          category: input.category,
        });
        return res.credited_xp;
      } catch (e) {
        console.error("[focus] registro atômico da sessão FALHOU:", e);
        onRpcErrorRef.current?.("Não foi possível registrar a sessão de foco.");
        return 0;
      }
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

  /**
   * Atualiza TODOS os campos editáveis de uma missão (título, subtítulo,
   * categoria, turno, dificuldade, XP e agendamento). Aplica de forma otimista
   * e persiste no banco.
   */
  const updateMission = useCallback(
    (
      id: string,
      patch: Pick<
        Mission,
        "title" | "description" | "category" | "difficulty" | "shift" | "xp" | "schedule"
      >,
    ) => {
      setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
      const parts = scheduleParts(patch.schedule);
      updateMissionFull(id, {
        title: patch.title,
        description: patch.description,
        category: patch.category,
        difficulty: patch.difficulty,
        shift: patch.shift,
        xp: patch.xp,
        scheduleType: parts.scheduleType,
        scheduleWeekdays: parts.scheduleWeekdays,
        scheduleDates: parts.scheduleDates,
      }).catch((e) => console.error(e));
    },
    [],
  );

  /** Remove a missão do banco e da lista. */
  const removeMission = useCallback((id: string) => {
    setMissions((prev) => prev.filter((m) => m.id !== id));
    deleteMission(id).catch((e) => console.error(e));
  }, []);

  // `todayKey` (day tick) nas deps: na virada de meia-noite com o app aberto,
  // a lista "de hoje" e os contadores re-derivam para o novo dia (auditoria A2).
  const todayMissions = useMemo(() => {
    const now = new Date();
    return sortMissions(missions.filter((m) => occursOn(m, now)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missions, todayKey]);

  const stats = useMemo(() => {
    const tk = todayKey ?? toISODate(new Date());
    const done = todayMissions.filter((m) => isDoneForDay(m, tk));
    return {
      total: todayMissions.length,
      done: done.length,
      xpEarned: done.reduce((sum, m) => sum + m.xp, 0),
    };
    // `completions` entra nas deps para recalcular quando uma conclusão
    // por-dia muda (isDoneForDay lê o mapa vindo do servidor).
  }, [todayMissions, completions, isDoneForDay, todayKey]);

  return {
    missions: todayMissions,
    allMissions: missions,
    toggle,
    toggleForDay,
    isCompletedForDay,
    isDoneForDay,
    fail,
    addMission,
    addCompletedMission,
    updateSchedule,
    updateMission,
    removeMission,
    stats,
  };
}
