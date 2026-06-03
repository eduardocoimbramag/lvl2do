import type { Category } from "./types";

/**
 * Camada de métricas por período (mock).
 *
 * Estrutura pensada para refletir Semanal / Mensal / Anual de forma realista.
 * Quando houver backend, basta trocar `metricsByPeriod` por dados vindos da API
 * mantendo este mesmo formato — a UI (página de Métricas) não muda.
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

/** Dados mock distintos por período. */
export const metricsByPeriod: Record<MetricsPeriod, PeriodMetrics> = {
  Semanal: {
    xpInPeriod: 1860,
    missionsCompleted: 34,
    completionRate: 74,
    longestStreak: 6,
    chartTitle: "XP por dia",
    seriesAxisLabel: "Últimos 7 dias",
    series: [
      { label: "Seg", xp: 220 },
      { label: "Ter", xp: 300 },
      { label: "Qua", xp: 180 },
      { label: "Qui", xp: 340 },
      { label: "Sex", xp: 280 },
      { label: "Sáb", xp: 260 },
      { label: "Dom", xp: 280 },
    ],
    categories: [
      { category: "Profissional", completion: 78 },
      { category: "Pessoal", completion: 58 },
      { category: "Saúde", completion: 36 },
    ],
  },
  Mensal: {
    xpInPeriod: 7320,
    missionsCompleted: 142,
    completionRate: 69,
    longestStreak: 12,
    chartTitle: "XP por semana",
    seriesAxisLabel: "Últimas 4 semanas",
    series: [
      { label: "S1", xp: 1640 },
      { label: "S2", xp: 1980 },
      { label: "S3", xp: 1720 },
      { label: "S4", xp: 1980 },
    ],
    categories: [
      { category: "Profissional", completion: 72 },
      { category: "Pessoal", completion: 64 },
      { category: "Saúde", completion: 48 },
    ],
  },
  Anual: {
    xpInPeriod: 81450,
    missionsCompleted: 1568,
    completionRate: 66,
    longestStreak: 28,
    chartTitle: "XP por mês",
    seriesAxisLabel: "Últimos 12 meses",
    series: [
      { label: "Jan", xp: 5200 },
      { label: "Fev", xp: 4800 },
      { label: "Mar", xp: 6100 },
      { label: "Abr", xp: 6700 },
      { label: "Mai", xp: 7200 },
      { label: "Jun", xp: 6400 },
      { label: "Jul", xp: 7000 },
      { label: "Ago", xp: 7600 },
      { label: "Set", xp: 6900 },
      { label: "Out", xp: 7300 },
      { label: "Nov", xp: 5050 },
      { label: "Dez", xp: 5200 },
    ],
    categories: [
      { category: "Profissional", completion: 70 },
      { category: "Pessoal", completion: 61 },
      { category: "Saúde", completion: 52 },
    ],
  },
};

/** Área mais forte (maior conclusão) do período. */
export function strongestCategory(period: MetricsPeriod): CategoryCompletion {
  return [...metricsByPeriod[period].categories].sort(
    (a, b) => b.completion - a.completion,
  )[0];
}

/** Área mais fraca (menor conclusão) do período. */
export function weakestCategory(period: MetricsPeriod): CategoryCompletion {
  const sorted = [...metricsByPeriod[period].categories].sort(
    (a, b) => b.completion - a.completion,
  );
  return sorted[sorted.length - 1];
}
