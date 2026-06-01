import { Category } from "./types";

/**
 * Mock de estatísticas — usado em /dashboard, /progress e /profile.
 * FUTURO: derivar de eventos reais (missões concluídas, streaks etc.).
 */

export const userProfile = {
  name: "Eduardo",
  title: "Executor em Evolução",
  level: 4,
  xpCurrent: 340,
  xpToNext: 500,
  streak: 5,
  longestStreak: 12,
  joinedAt: "Jan 2026",
};

export const dailyOverview = {
  missionsDone: 4,
  missionsTotal: 7,
  weeklyProgress: 68, // %
};

export const totals = {
  totalXp: 4820,
  missionsCompleted: 213,
  weeklyCompletionRate: 74, // %
  longestStreak: 12,
};

/** XP por semana — gráfico de evolução (/progress). */
export const xpPerWeek: { week: string; xp: number }[] = [
  { week: "S1", xp: 260 },
  { week: "S2", xp: 340 },
  { week: "S3", xp: 300 },
  { week: "S4", xp: 420 },
  { week: "S5", xp: 380 },
  { week: "S6", xp: 500 },
  { week: "S7", xp: 460 },
];

/** Conclusão por categoria (%) — barras / radar (/progress, /dashboard). */
export const categoryProgress: { category: Category; completion: number }[] = [
  { category: "Estudos", completion: 82 },
  { category: "Carreira", completion: 70 },
  { category: "Finanças", completion: 64 },
  { category: "Pessoal", completion: 58 },
  { category: "Saúde", completion: 30 },
];

export const strongestArea = categoryProgress[0]; // Estudos — 82%
export const weakestArea = categoryProgress[categoryProgress.length - 1]; // Saúde — 30%
