/** Shared domain types for lvl2do (mock layer). */

export type Category = "Carreira" | "Saúde" | "Estudos" | "Finanças" | "Pessoal";

export type Difficulty = "Fácil" | "Média" | "Difícil";

export type MissionStatus = "pending" | "done";

export interface Mission {
  id: string;
  title: string;
  description?: string;
  category: Category;
  difficulty: Difficulty;
  status: MissionStatus;
  xp: number;
}

/** XP rewarded per difficulty level. */
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  Fácil: 10,
  Média: 25,
  Difícil: 50,
};

export const CATEGORIES: Category[] = [
  "Carreira",
  "Saúde",
  "Estudos",
  "Finanças",
  "Pessoal",
];

export const DIFFICULTIES: Difficulty[] = ["Fácil", "Média", "Difícil"];
