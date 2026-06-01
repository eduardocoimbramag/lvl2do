/** Shared domain types for lvl2do (mock layer). */

export type Category = "Profissional" | "Pessoal" | "Saúde";

export type Difficulty = "Fácil" | "Média" | "Difícil";

export type Shift = "Manhã" | "Tarde" | "Noite";

export type MissionStatus = "pending" | "done" | "failed";

export interface Mission {
  id: string;
  title: string;
  description?: string;
  category: Category;
  difficulty: Difficulty;
  shift: Shift;
  status: MissionStatus;
  xp: number;
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
