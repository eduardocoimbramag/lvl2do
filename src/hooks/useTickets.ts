"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLocalDateKey } from "@/lib/xp-system";
import type { Ticket, TicketType } from "@/data/types";

const STORAGE_KEY = "lvl2do.tickets.v1";

/** Lê os tickets do localStorage (ou lista vazia). Tolerante a erros. */
function loadTickets(): Ticket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Ticket[]) : [];
  } catch {
    return [];
  }
}

export interface NewTicketInput {
  type: TicketType;
  title: string;
  description: string;
}

/**
 * Hook de tickets de suporte (problema/sugestão/dúvida), com persistência em
 * localStorage. Sem backend ainda — pronto para trocar por API/banco depois.
 */
export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const hydrated = useRef(false);

  // hidrata do localStorage uma vez (no cliente)
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setTickets(loadTickets());
  }, []);

  /** Persiste e atualiza o estado. */
  const commit = useCallback((next: Ticket[]) => {
    setTickets(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignora cota/erros de storage */
      }
    }
  }, []);

  /** Cria um novo ticket (mais recente no topo). Retorna o ticket criado. */
  const addTicket = useCallback(
    (input: NewTicketInput): Ticket => {
      const now = new Date();
      const ticket: Ticket = {
        id: `ticket-${now.getTime()}-${Math.round(now.getTime() % 1000)}`,
        type: input.type,
        title: input.title.trim(),
        description: input.description.trim(),
        createdAt: getLocalDateKey(now),
        status: "Aberto",
      };
      commit([ticket, ...tickets]);
      return ticket;
    },
    [tickets, commit],
  );

  /** Alterna o status entre Aberto/Resolvido. */
  const toggleResolved = useCallback(
    (id: string) => {
      commit(
        tickets.map((t) =>
          t.id === id
            ? { ...t, status: t.status === "Resolvido" ? "Aberto" : "Resolvido" }
            : t,
        ),
      );
    },
    [tickets, commit],
  );

  /** Remove um ticket. */
  const removeTicket = useCallback(
    (id: string) => commit(tickets.filter((t) => t.id !== id)),
    [tickets, commit],
  );

  return { tickets, addTicket, toggleResolved, removeTicket };
}
