import type { Category } from "./types";

/**
 * Tipos da camada de métricas (Semanal / Mensal / Anual).
 *
 * Os dados REAIS são derivados de `xp_events` + missões do usuário no hook
 * `useMetrics`. Este arquivo mantém apenas os tipos e helpers puros.
 */

export type MetricsPeriod = "Semanal" | "Mensal" | "Anual";

export const METRICS_PERIODS: MetricsPeriod[] = ["Semanal", "Mensal", "Anual"];

/** Ponto da série temporal do gráfico de XP. */
export interface XpPoint {
  label: string;
  xp: number;
}

/** Conclusão (%) de uma categoria. */
export interface CategoryCompletion {
  category: Category;
  completion: number;
}

export interface PeriodMetrics {
  /** XP ganho no período. */
  xpInPeriod: number;
  /** Missões concluídas no período. */
  missionsCompleted: number;
  /** Percentual de conclusão no período (%). */
  completionRate: number;
  /** Maior sequência (dias) registrada no período. */
  longestStreak: number;
  /** Rótulo do eixo X do gráfico (ex.: "Últimos 7 dias"). */
  seriesAxisLabel: string;
  /** Título do gráfico para o período (ex.: "XP por dia"). */
  chartTitle: string;
  /** Série de XP do período. */
  series: XpPoint[];
  /** Conclusão por categoria no período. */
  categories: CategoryCompletion[];
}

/** Área mais forte (maior conclusão) de uma lista de categorias. */
export function strongestOf(categories: CategoryCompletion[]): CategoryCompletion | null {
  if (categories.length === 0) return null;
  return [...categories].sort((a, b) => b.completion - a.completion)[0];
}

/** Área mais fraca (menor conclusão) de uma lista de categorias. */
export function weakestOf(categories: CategoryCompletion[]): CategoryCompletion | null {
  if (categories.length === 0) return null;
  return [...categories].sort((a, b) => b.completion - a.completion).at(-1) ?? null;
}
