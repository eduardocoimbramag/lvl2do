"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppNotification, NotificationType } from "@/data/types";

const STORAGE_KEY = "lvl2do.notifications.v1";

/** Lê as notificações do localStorage (ou lista vazia). Tolerante a erros. */
function loadNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppNotification[]) : [];
  } catch {
    return [];
  }
}

export interface NewNotificationInput {
  type: NotificationType;
  title: string;
  description?: string;
}

/**
 * Hook de notificações, com persistência em localStorage.
 *
 * Começa vazio — o sistema que gera notificações (level up, missões, etc.)
 * será plugado depois chamando `addNotification`. A UI já consome este hook,
 * pronto para trocar a fonte por API/banco no futuro.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const hydrated = useRef(false);

  // hidrata do localStorage uma vez (no cliente)
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setNotifications(loadNotifications());
  }, []);

  /** Persiste e atualiza o estado. */
  const commit = useCallback((next: AppNotification[]) => {
    setNotifications(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignora cota/erros de storage */
      }
    }
  }, []);

  /** Cria uma nova notificação (mais recente no topo). */
  const addNotification = useCallback(
    (input: NewNotificationInput): AppNotification => {
      const now = new Date();
      const notification: AppNotification = {
        id: `notif-${now.getTime()}-${Math.round(now.getTime() % 1000)}`,
        type: input.type,
        title: input.title,
        description: input.description,
        createdAt: now.toISOString(),
        read: false,
      };
      commit([notification, ...notifications]);
      return notification;
    },
    [notifications, commit],
  );

  /** Marca todas como lidas. */
  const markAllRead = useCallback(() => {
    commit(notifications.map((n) => (n.read ? n : { ...n, read: true })));
  }, [notifications, commit]);

  /** Remove uma notificação. */
  const removeNotification = useCallback(
    (id: string) => commit(notifications.filter((n) => n.id !== id)),
    [notifications, commit],
  );

  /** Limpa todas. */
  const clearAll = useCallback(() => commit([]), [commit]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    addNotification,
    markAllRead,
    removeNotification,
    clearAll,
  };
}
