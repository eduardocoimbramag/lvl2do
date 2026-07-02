"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Category } from "@/data/types";

const STORAGE_KEY = "lvl2do.focusSessions.v1";
/** Mantém no máximo N sessões (evita crescer sem limite). */
const MAX_SESSIONS = 200;

/** Uma sessão de foco CONCLUÍDA, registrada no histórico. */
export interface FocusSession {
  id: string;
  /** nome da sessão. */
  title: string;
  /** área (categoria) escolhida. */
  category: Category;
  /** duração em minutos. */
  minutes: number;
  /** XP creditado ao concluir. */
  xp: number;
  /** data/hora de conclusão (ISO). */
  completedAt: string;
}

function loadSessions(): FocusSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FocusSession[]) : [];
  } catch {
    return [];
  }
}

export type NewFocusSession = Omit<FocusSession, "id" | "completedAt">;

/**
 * Histórico de sessões de foco concluídas, persistido em localStorage.
 * Só sessões que chegam ao fim são registradas (interrompidas não entram).
 */
export function useFocusHistory() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setSessions(loadSessions());
    setHydrated(true);
  }, []);

  const commit = useCallback((next: FocusSession[]) => {
    const trimmed = next.slice(0, MAX_SESSIONS);
    setSessions(trimmed);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        /* ignora cota/erros */
      }
    }
  }, []);

  /** Registra uma sessão concluída (mais recente no topo). */
  const addSession = useCallback(
    (input: NewFocusSession): FocusSession => {
      const now = new Date();
      const session: FocusSession = {
        ...input,
        id: `focus-${now.getTime()}`,
        completedAt: now.toISOString(),
      };
      commit([session, ...sessions]);
      return session;
    },
    [sessions, commit],
  );

  /** Limpa todo o histórico. */
  const clearAll = useCallback(() => commit([]), [commit]);

  return { sessions, hydrated, addSession, clearAll };
}
