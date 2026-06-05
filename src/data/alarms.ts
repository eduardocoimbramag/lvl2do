/**
 * Tipos e lógica de domínio dos Alarmes.
 *
 * Reaproveita o conceito de agendamento das missões (once/weekly/dates), e
 * adiciona repetição intradiária (tocar várias vezes no mesmo dia, ex.: beber
 * água a cada 1h das 08:00 às 18:00).
 *
 * Tudo aqui é lógica pura e testável — o disparo real (som/notificação) e a
 * persistência ficam nos hooks.
 */

import { WEEKDAYS, toISODate, type Weekday } from "@/data/types";

/* -------------------------------------------------------------------------- */
/*  Recorrência (em quais DIAS o alarme vale)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Em quais dias o alarme dispara:
 * - once: uma única vez (na próxima ocorrência do horário — hoje ou amanhã).
 * - weekly: recorre nos dias da semana escolhidos.
 * - dates: em datas específicas (ISO "YYYY-MM-DD").
 */
export type AlarmRepeat =
  | { type: "once" }
  | { type: "weekly"; weekdays: Weekday[] }
  | { type: "dates"; dates: string[] };

export type AlarmRepeatType = AlarmRepeat["type"];

/* -------------------------------------------------------------------------- */
/*  Repetição intradiária (quantas vezes no MESMO dia)                         */
/* -------------------------------------------------------------------------- */

/**
 * Repetição dentro do dia. Quando ligada, o alarme toca do `time` (primeiro
 * toque, definido no Alarm) até `untilTime`, a cada `intervalMinutes`.
 */
export interface AlarmIntradayRepeat {
  enabled: boolean;
  /** intervalo entre toques, em minutos (ex.: 60 = a cada 1h). */
  intervalMinutes: number;
  /** horário do último toque possível, "HH:MM" (inclusive). */
  untilTime: string;
}

/* -------------------------------------------------------------------------- */
/*  Alarme                                                                     */
/* -------------------------------------------------------------------------- */

export interface Alarm {
  id: string;
  /** rótulo do alarme (ex.: "Beber água", "Tomar remédio"). */
  label: string;
  /** horário do primeiro toque, "HH:MM" (24h). */
  time: string;
  /** repetição dentro do mesmo dia (intervalo + horário limite). */
  intraday: AlarmIntradayRepeat;
  /** em quais dias o alarme vale (once/weekly/dates). */
  repeat: AlarmRepeat;
  /** id do som escolhido (ver alarm-sounds). */
  soundId: string;
  /** alarme ativo? (pode ser pausado sem apagar). */
  enabled: boolean;
  /** data de criação (ISO). */
  createdAt: string;
}

/** Limites sensatos para o intervalo intradiário (em minutos). */
export const MIN_INTERVAL_MINUTES = 5;
export const MAX_INTERVAL_MINUTES = 12 * 60; // 12h

/** Opções rápidas de intervalo oferecidas na UI (minutos). */
export const INTERVAL_PRESETS: { label: string; minutes: number }[] = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 h", minutes: 60 },
  { label: "2 h", minutes: 120 },
  { label: "3 h", minutes: 180 },
  { label: "4 h", minutes: 240 },
];

/* -------------------------------------------------------------------------- */
/*  Helpers de horário ("HH:MM")                                               */
/* -------------------------------------------------------------------------- */

/** Converte "HH:MM" em minutos desde a meia-noite (ou null se inválido). */
export function timeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Converte minutos desde a meia-noite em "HH:MM" (24h, com zero à esquerda). */
export function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Todos os horários ("HH:MM") em que o alarme toca em um dia (ordenados).
 * Sem repetição intradiária → apenas o horário inicial. Com repetição →
 * do `time` até `untilTime` a cada `intervalMinutes` (limitado para evitar
 * laços absurdos).
 */
export function alarmFireTimes(alarm: Alarm): string[] {
  const start = timeToMinutes(alarm.time);
  if (start === null) return [];

  if (!alarm.intraday.enabled) return [minutesToTime(start)];

  // clamp defensivo do intervalo (a UI valida, mas a função pura também protege)
  const interval = Math.max(
    MIN_INTERVAL_MINUTES,
    Math.min(MAX_INTERVAL_MINUTES, Math.round(alarm.intraday.intervalMinutes)),
  );
  const until = timeToMinutes(alarm.intraday.untilTime);
  // se o limite for inválido ou anterior ao início, cai para um único toque
  if (until === null || until < start) return [minutesToTime(start)];

  const times: string[] = [];
  // teto de segurança: no máximo 24h de toques (1440 / menor intervalo)
  const maxCount = Math.floor((24 * 60) / MIN_INTERVAL_MINUTES) + 1;
  for (let t = start, i = 0; t <= until && i < maxCount; t += interval, i++) {
    times.push(minutesToTime(t));
  }
  return times;
}

/** Quantos toques o alarme tem por dia (1 quando não há repetição intradiária). */
export function alarmFireCount(alarm: Alarm): number {
  return alarmFireTimes(alarm).length;
}

/* -------------------------------------------------------------------------- */
/*  Em qual DIA o alarme dispara                                               */
/* -------------------------------------------------------------------------- */

/**
 * O alarme vale para uma data específica?
 * - weekly: o dia da semana está na lista.
 * - dates: a data ISO está na lista.
 * - once: tratado pelo chamador (depende de "hoje/amanhã" em tempo real); aqui
 *   retornamos false porque "once" não tem data fixa armazenada.
 */
export function alarmOccursOnDate(alarm: Alarm, date: Date): boolean {
  switch (alarm.repeat.type) {
    case "once":
      return false;
    case "weekly":
      return alarm.repeat.weekdays.includes(date.getDay() as Weekday);
    case "dates":
      return alarm.repeat.dates.includes(toISODate(date));
  }
}

/* -------------------------------------------------------------------------- */
/*  Descrições para a UI                                                       */
/* -------------------------------------------------------------------------- */

/** Resumo curto da recorrência por dias (ex.: "Seg, Qua" ou "2 datas"). */
export function describeAlarmRepeat(repeat: AlarmRepeat): string {
  switch (repeat.type) {
    case "once":
      return "Uma vez";
    case "weekly": {
      if (repeat.weekdays.length === 0) return "Nenhum dia";
      if (repeat.weekdays.length === 7) return "Todos os dias";
      return WEEKDAYS.filter((w) => repeat.weekdays.includes(w.value))
        .map((w) => w.short)
        .join(", ");
    }
    case "dates": {
      const n = repeat.dates.length;
      if (n === 0) return "Nenhuma data";
      return n === 1 ? "1 data" : `${n} datas`;
    }
  }
}

/** Descrição amigável da repetição intradiária (ou null se desligada). */
export function describeAlarmIntraday(intraday: AlarmIntradayRepeat): string | null {
  if (!intraday.enabled) return null;
  const interval = Math.round(intraday.intervalMinutes);
  const label =
    interval % 60 === 0 ? `${interval / 60}h` : interval > 60 ? `${Math.floor(interval / 60)}h${interval % 60}` : `${interval}min`;
  return `A cada ${label} até ${intraday.untilTime}`;
}

/** Valores padrão de um novo alarme (antes de o usuário preencher). */
export function defaultAlarmDraft(): Omit<Alarm, "id" | "createdAt"> {
  return {
    label: "",
    time: "08:00",
    intraday: { enabled: false, intervalMinutes: 60, untilTime: "18:00" },
    repeat: { type: "once" },
    soundId: "", // preenchido com o primeiro som do catálogo na UI
    enabled: true,
  };
}
