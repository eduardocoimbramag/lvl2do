"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  alarmFireTimes,
  alarmOccursOnDate,
  timeToMinutes,
  type Alarm,
} from "@/data/alarms";
import { getSoundLabel } from "@/lib/alarm-sounds";
import { toISODate } from "@/data/types";
import { useAlarmSound } from "./useAlarmSound";
import { useAppNotifications } from "./AppStateProvider";

const DISPATCH_KEY = "lvl2do.alarms.fired.v1";
/** Quantas chaves de disparo manter (evita crescer sem limite). */
const MAX_FIRED_KEYS = 500;

/** "YYYY-MM-DDTHH:MM" para a data informada (minuto local). */
function minuteKey(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${toISODate(d)}T${hh}:${mm}`;
}

/** Lê o set de disparos já efetuados (persistido). */
function loadFired(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISPATCH_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveFired(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    // mantém só as últimas chaves (ordem de inserção do Set)
    const arr = Array.from(set);
    const trimmed = arr.slice(Math.max(0, arr.length - MAX_FIRED_KEYS));
    window.localStorage.setItem(DISPATCH_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignora */
  }
}

interface SchedulerOptions {
  /** desativa um alarme (usado para "once" após o último toque). */
  onAlarmExpired?: (id: string) => void;
}

/**
 * Motor de disparo dos alarmes. Roda um tick periódico e, a cada minuto novo,
 * dispara os alarmes cujo horário corresponde — tocando o som e criando uma
 * notificação. Funciona enquanto a aba está aberta (limite do navegador).
 *
 * Garantias:
 * - Cada (alarme + minuto exato) dispara no máximo uma vez (Set persistido),
 *   mesmo com múltiplos ticks ou re-render.
 * - Alarmes "once" são desativados após seu último toque do dia, para não
 *   repetirem nos dias seguintes.
 * - Não dispara retroativamente: ao montar, marca o minuto atual como base e só
 *   dispara minutos que chegarem a partir daí (não toca alarmes "perdidos").
 */
export function useAlarmScheduler(alarms: Alarm[], options: SchedulerOptions = {}) {
  const { fire } = useAlarmSound();
  const { addNotification } = useAppNotifications();

  // refs para acessar valores atuais dentro do intervalo sem recriá-lo
  const alarmsRef = useRef<Alarm[]>(alarms);
  alarmsRef.current = alarms;
  const firedRef = useRef<Set<string>>(new Set());
  const lastMinuteRef = useRef<string | null>(null);
  const onExpiredRef = useRef(options.onAlarmExpired);
  onExpiredRef.current = options.onAlarmExpired;

  /** Processa o minuto atual: dispara o que casar e ainda não disparou. */
  const processNow = useCallback(() => {
    const now = new Date();
    const key = minuteKey(now);
    // só processa quando o minuto muda (evita reprocessar no mesmo minuto)
    if (lastMinuteRef.current === key) return;
    lastMinuteRef.current = key;

    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const nowHM = `${hh}:${mm}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (const alarm of alarmsRef.current) {
      if (!alarm.enabled) continue;

      // este alarme vale para HOJE?
      const occursToday =
        alarm.repeat.type === "once" ? true : alarmOccursOnDate(alarm, now);
      if (!occursToday) continue;

      const times = alarmFireTimes(alarm);
      if (times.length === 0) continue;

      // "once": não disparar se o horário inicial já passou no momento da criação
      // (tratamos abaixo só pelo minuto exato — não dispara retroativo).
      if (!times.includes(nowHM)) continue;

      const firedKey = `${alarm.id}@${key}`;
      if (firedRef.current.has(firedKey)) continue;

      // dispara!
      firedRef.current.add(firedKey);
      fire(alarm.soundId);
      addNotification({
        type: "info",
        title: `⏰ ${alarm.label || "Alarme"}`,
        description: `${nowHM} · ${getSoundLabel(alarm.soundId)}`,
      });

      // "once": desativa após o ÚLTIMO toque do dia (respeita repetição intradiária)
      if (alarm.repeat.type === "once") {
        const lastTime = times[times.length - 1];
        const lastMinutes = timeToMinutes(lastTime);
        if (lastMinutes !== null && nowMinutes >= lastMinutes) {
          onExpiredRef.current?.(alarm.id);
        }
      }
    }

    saveFired(firedRef.current);
  }, [fire, addNotification]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    firedRef.current = loadFired();
    // base: marca o minuto atual como já "visto" para não disparar retroativo
    lastMinuteRef.current = minuteKey(new Date());

    const id = window.setInterval(processNow, 15_000); // checa 4x/min
    return () => window.clearInterval(id);
  }, [processNow]);
}
