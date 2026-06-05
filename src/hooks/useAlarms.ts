"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Alarm } from "@/data/alarms";

const STORAGE_KEY = "lvl2do.alarms.v1";

/** Lê os alarmes do localStorage (ou lista vazia). Tolerante a erros. */
function loadAlarms(): Alarm[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Alarm[]) : [];
  } catch {
    return [];
  }
}

/** Dados necessários para criar um alarme (id/createdAt são gerados aqui). */
export type NewAlarmInput = Omit<Alarm, "id" | "createdAt">;

/**
 * Hook de alarmes com persistência em localStorage (lvl2do.alarms.v1).
 *
 * Mesmo padrão de useNotifications: hidrata uma vez no cliente e persiste a
 * cada mutação. Pronto para trocar a fonte por API/banco no futuro.
 */
export function useAlarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  // hidrata do localStorage uma vez
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setAlarms(loadAlarms());
    setHydrated(true);
  }, []);

  /** Persiste e atualiza o estado. */
  const commit = useCallback((next: Alarm[]) => {
    setAlarms(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignora cota/erros de storage */
      }
    }
  }, []);

  /** Cria um alarme (mais recente no topo) e retorna-o. */
  const addAlarm = useCallback(
    (input: NewAlarmInput): Alarm => {
      const now = new Date();
      const alarm: Alarm = {
        ...input,
        id: `alarm-${now.getTime()}-${Math.round(now.getTime() % 1000)}`,
        createdAt: now.toISOString(),
      };
      commit([alarm, ...alarms]);
      return alarm;
    },
    [alarms, commit],
  );

  /** Atualiza um alarme existente por id (merge dos campos informados). */
  const updateAlarm = useCallback(
    (id: string, patch: Partial<NewAlarmInput>) => {
      commit(alarms.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    },
    [alarms, commit],
  );

  /** Remove um alarme. */
  const removeAlarm = useCallback(
    (id: string) => commit(alarms.filter((a) => a.id !== id)),
    [alarms, commit],
  );

  /** Define explicitamente o estado ativo de um alarme (idempotente). */
  const setEnabled = useCallback(
    (id: string, value: boolean) =>
      commit(alarms.map((a) => (a.id === id ? { ...a, enabled: value } : a))),
    [alarms, commit],
  );

  /** Liga/desliga um alarme (sem apagá-lo). */
  const toggleEnabled = useCallback(
    (id: string) =>
      commit(alarms.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))),
    [alarms, commit],
  );

  const enabledCount = useMemo(() => alarms.filter((a) => a.enabled).length, [alarms]);

  return {
    alarms,
    /** terminou de hidratar do storage? (evita "piscar" vazio no primeiro render). */
    hydrated,
    enabledCount,
    addAlarm,
    updateAlarm,
    removeAlarm,
    setEnabled,
    toggleEnabled,
  };
}
