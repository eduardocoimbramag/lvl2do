/** Shared domain types for lvl2do (mock layer). */

export type Category = "Profissional" | "Pessoal" | "Saúde";

export type Difficulty = "Fácil" | "Média" | "Difícil";

export type Shift = "Manhã" | "Tarde" | "Noite";

export type MissionStatus = "pending" | "done" | "failed";

/* -------------------------------------------------------------------------- */
/*  Tickets (suporte)                                                          */
/* -------------------------------------------------------------------------- */

export type TicketType = "Problema" | "Sugestão" | "Dúvida";

export type TicketStatus = "Aberto" | "Resolvido";

export interface Ticket {
  id: string;
  type: TicketType;
  title: string;
  description: string;
  /** data de criação (ISO "YYYY-MM-DD"). */
  createdAt: string;
  status: TicketStatus;
}

export const TICKET_TYPES: TicketType[] = ["Problema", "Sugestão", "Dúvida"];

/* -------------------------------------------------------------------------- */
/*  Notificações                                                               */
/* -------------------------------------------------------------------------- */

export type NotificationType = "info" | "success" | "warning";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  /** detalhe opcional. */
  description?: string;
  /** data/hora de criação (ISO). */
  createdAt: string;
  read: boolean;
}

/** Dia da semana: 0 = Domingo … 6 = Sábado (compatível com Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Regra de agendamento de uma missão.
 * - today: aparece no dia atual.
 * - weekly: recorre nos dias da semana escolhidos.
 * - dates: ocorre em datas específicas (ISO "YYYY-MM-DD").
 */
export type MissionSchedule =
  | { type: "today" }
  | { type: "weekly"; weekdays: Weekday[] }
  | { type: "dates"; dates: string[] };

export interface Mission {
  id: string;
  title: string;
  description?: string;
  category: Category;
  difficulty: Difficulty;
  shift: Shift;
  status: MissionStatus;
  xp: number;
  schedule: MissionSchedule;
  /**
   * Data de criação (ISO). Para missões "Hoje", define o único dia em que a
   * missão ocorre (o "hoje" em que foi criada). Ausente em mocks antigos.
   */
  createdAt?: string;
  /** Data/hora (ISO) da última conclusão (status global), ou null. */
  completedAt?: string | null;
}

/** XP rewarded per difficulty level. */
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  Fácil: 10,
  Média: 25,
  Difícil: 50,
};

export const CATEGORIES: Category[] = ["Profissional", "Pessoal", "Saúde"];

export const DIFFICULTIES: Difficulty[] = ["Fácil", "Média", "Difícil"];

export const SHIFTS: Shift[] = ["Manhã", "Tarde", "Noite"];

/** Dias da semana ordenados como na UI (Seg → Dom), com rótulos curto e longo. */
export const WEEKDAYS: { value: Weekday; short: string; long: string }[] = [
  { value: 1, short: "Seg", long: "Segunda" },
  { value: 2, short: "Ter", long: "Terça" },
  { value: 3, short: "Qua", long: "Quarta" },
  { value: 4, short: "Qui", long: "Quinta" },
  { value: 5, short: "Sex", long: "Sexta" },
  { value: 6, short: "Sáb", long: "Sábado" },
  { value: 0, short: "Dom", long: "Domingo" },
];

/** Converte uma Date para a chave ISO local "YYYY-MM-DD" (sem fuso/UTC). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Indica se uma missão está agendada para um dia específico, segundo sua regra. */
export function isScheduledOn(schedule: MissionSchedule, date: Date): boolean {
  switch (schedule.type) {
    case "today":
      // "Hoje" não tem data fixa — tratado fora (comparado ao dia atual real).
      return false;
    case "weekly":
      return schedule.weekdays.includes(date.getDay() as Weekday);
    case "dates":
      return schedule.dates.includes(toISODate(date));
  }
}

/** Resumo curto da regra de agendamento (ex.: "Seg, Qua" ou "2 datas"). */
export function describeSchedule(schedule: MissionSchedule): string {
  switch (schedule.type) {
    case "today":
      return "Hoje";
    case "weekly": {
      if (schedule.weekdays.length === 0) return "Nenhum dia";
      const labels = WEEKDAYS.filter((w) => schedule.weekdays.includes(w.value)).map(
        (w) => w.short,
      );
      return labels.join(", ");
    }
    case "dates": {
      const n = schedule.dates.length;
      if (n === 0) return "Nenhuma data";
      return n === 1 ? "1 data" : `${n} datas`;
    }
  }
}
