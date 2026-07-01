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

/** Contexto de uma conclusão/reversão (para creditar XP e logar evento). */
export interface MissionXpContext {
  /** XP base da missão (gain) ou XP creditado a devolver (revert). */
  xp: number;
  category: Mission["category"];
  /** id da missão (ausente em missões de foco ainda não persistidas). */
  missionId?: string;
  /**
   * Dia-alvo ("YYYY-MM-DD") da conclusão. Quando ausente, é hoje. Usado pelo
   * calendário para concluir/desfazer missões de ontem no orçamento correto.
   */
  targetDateKey?: string;
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

  /**
   * Conclusões RETROATIVAS (ex.: missões de ontem marcadas no calendário).
   * Como as missões têm um único `status` global (não por dia), não alteramos o
   * status — registramos a conclusão por (missão+dia) à parte e creditamos o XP
   * no orçamento daquele dia. Persistido em localStorage para sobreviver a
   * recarregar (o orçamento de ontem só vale até virar o dia).
   */
  const RETRO_KEY = "lvl2do.retroCompletions.v1";
  const [retro, setRetro] = useState<Record<string, number>>({});
  const retroRef = useRef<Record<string, number>>({});
  retroRef.current = retro;

  // hidrata as conclusões retroativas do localStorage (uma vez)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(RETRO_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setRetro(parsed as Record<string, number>);
      }
    } catch {
      /* ignora */
    }
  }, []);

  const commitRetro = useCallback((next: Record<string, number>) => {
    setRetro(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(RETRO_KEY, JSON.stringify(next));
      } catch {
        /* ignora */
      }
    }
  }, []);

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
  const retroKeyOf = (id: string, dateKey: string) => `${id}@${dateKey}`;

  /**
   * Conclui/desfaz uma missão registrando a conclusão POR DIA (mapa retro), sem
   * alterar o `status` global. Credita/reverte o XP no orçamento do `dateKey`
   * (via targetDateKey). Usado para recorrentes (qualquer dia) e para o
   * calendário. Quando `dateKey` é hoje, o crédito cai no orçamento de hoje e
   * conta streak — idêntico ao fluxo antigo, só muda ONDE guardamos o "feito".
   */
  const toggleRetroForDay = useCallback(
    (id: string, dateKey: string) => {
      const target = missionsRef.current.find((m) => m.id === id);
      if (!target) return;

      const key = retroKeyOf(id, dateKey);
      const already = key in retroRef.current;

      if (!already) {
        const credited =
          onCompletedRef.current?.({
            xp: target.xp,
            category: target.category,
            missionId: id,
            targetDateKey: dateKey,
          }) ?? 0;
        commitRetro({ ...retroRef.current, [key]: credited });
      } else {
        // crédito exato (persistido) ou, na falta, o XP base da missão
        const credited = retroRef.current[key] ?? target.xp;
        const next = { ...retroRef.current };
        delete next[key];
        commitRetro(next);
        if (credited > 0) {
          onRevertedRef.current?.({
            xp: credited,
            category: target.category,
            missionId: id,
            targetDateKey: dateKey,
          });
        }
      }
    },
    [commitRetro],
  );

  /**
   * Alterna concluída/pendente (botão do card, dia de hoje).
   * - Recorrente (weekly/dates) → conclusão POR DIA (retro), para resetar no
   *   dia seguinte. NÃO altera o status global.
   * - "Uma vez" (today) / foco  → status global no banco (comportamento antigo).
   */
  const toggle = useCallback(
    (id: string) => {
      const target = missionsRef.current.find((m) => m.id === id);
      if (!target) return;

      if (isRecurring(target)) {
        toggleRetroForDay(id, toISODate(new Date()));
        return;
      }

      const isUndo = target.status === "done";
      const newStatus: MissionStatus = isUndo ? "pending" : "done";
      const nowISO = new Date().toISOString();

      setMissions((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: newStatus, completedAt: isUndo ? null : nowISO }
            : m,
        ),
      );
      updateMissionStatus(id, newStatus).catch((e) => console.error(e));

      if (!isUndo) {
        const credited =
          onCompletedRef.current?.({ xp: target.xp, category: target.category, missionId: id }) ?? 0;
        creditedByMission.current[id] = credited;
      } else {
        // XP a devolver: crédito exato desta sessão OU, se o ref se perdeu (ex.:
        // após recarregar), o XP base da missão — garante que desfazer SEMPRE
        // reverte, sem deixar o total inflado nem duplicar.
        const credited = creditedByMission.current[id] ?? target.xp;
        delete creditedByMission.current[id];
        if (credited > 0) {
          onRevertedRef.current?.({ xp: credited, category: target.category, missionId: id });
        }
      }
    },
    [toggleRetroForDay],
  );

  /** Uma (missão, dia) já foi concluída no mapa por-dia (retro)? */
  const isCompletedForDay = useCallback(
    (id: string, dateKey: string) => retroKeyOf(id, dateKey) in retroRef.current,
    [],
  );

  /**
   * A missão está concluída NAQUELE dia? Regra unificada de exibição:
   * - recorrente → consulta o mapa por-dia (retro);
   * - "uma vez"/foco → usa o status global (só faz sentido no dia dela).
   */
  const isDoneForDay = useCallback(
    (mission: Mission, dateKey: string) =>
      isRecurring(mission)
        ? retroKeyOf(mission.id, dateKey) in retroRef.current
        : mission.status === "done",
    [],
  );

  /**
   * Conclui/desfaz uma missão PARA UM DIA específico (usado pelo calendário).
   * - Hoje + "uma vez" → toggle normal (status real).
   * - Recorrente (qualquer dia) ou dia passado → conclusão por-dia (retro),
   *   creditando/revertendo no orçamento daquele dia.
   */
  const toggleForDay = useCallback(
    (id: string, dateKey: string) => {
      const target = missionsRef.current.find((m) => m.id === id);
      if (!target) return;
      const todayKey = toISODate(new Date());
      if (dateKey === todayKey && !isRecurring(target)) {
        toggle(id);
        return;
      }
      toggleRetroForDay(id, dateKey);
    },
    [toggle, toggleRetroForDay],
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
        createdAt: new Date().toISOString(),
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

  const todayMissions = useMemo(() => {
    const now = new Date();
    return sortMissions(missions.filter((m) => occursOn(m, now)));
  }, [missions]);

  const stats = useMemo(() => {
    const todayKey = toISODate(new Date());
    const done = todayMissions.filter((m) => isDoneForDay(m, todayKey));
    return {
      total: todayMissions.length,
      done: done.length,
      xpEarned: done.reduce((sum, m) => sum + m.xp, 0),
    };
    // `retro` entra nas deps para recalcular quando uma recorrente é concluída
    // por-dia (isDoneForDay lê o mapa retro).
  }, [todayMissions, retro, isDoneForDay]);

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
