"use client";

import { useEffect, useMemo, useState } from "react";
import { getXpEvents } from "@/lib/db/xpEvents";
import { getLocalDateKey, daysBetweenDateKeys } from "@/lib/xp-system";
import { CATEGORIES, type Mission } from "@/data/types";
import type {
  CategoryCompletion,
  MetricsPeriod,
  PeriodMetrics,
  XpPoint,
} from "@/data/metricsData";
import type { XpEventRow } from "@/types/database";

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Snapshot de conclusão por categoria a partir das missões do usuário. */
function categoriesFromMissions(missions: Mission[]): CategoryCompletion[] {
  return CATEGORIES.map((category) => {
    const inCat = missions.filter((m) => m.category === category);
    const done = inCat.filter((m) => m.status === "done").length;
    const completion = inCat.length === 0 ? 0 : Math.round((done / inCat.length) * 100);
    return { category, completion };
  });
}

/** Taxa de conclusão geral (missões concluídas / total). */
function completionRateFromMissions(missions: Mission[]): number {
  if (missions.length === 0) return 0;
  const done = missions.filter((m) => m.status === "done").length;
  return Math.round((done / missions.length) * 100);
}

/** Série diária (últimos 7 dias) a partir dos eventos. */
function weeklyMetrics(events: XpEventRow[], todayKey: string, today: Date) {
  const byDay = new Map<string, number>();
  for (const e of events) {
    const k = getLocalDateKey(new Date(e.created_at));
    byDay.set(k, (byDay.get(k) ?? 0) + e.amount);
  }
  const series: XpPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    series.push({ label: WEEKDAY_SHORT[day.getDay()], xp: byDay.get(getLocalDateKey(day)) ?? 0 });
  }
  const inWindow = (e: XpEventRow) => {
    const diff = daysBetweenDateKeys(getLocalDateKey(new Date(e.created_at)), todayKey);
    return diff >= 0 && diff <= 6;
  };
  return windowTotals(events, inWindow, series);
}

/** Série semanal (últimas 4 semanas) a partir dos eventos. */
function monthlyMetrics(events: XpEventRow[], todayKey: string) {
  const buckets = [0, 0, 0, 0]; // S1 (mais antiga) … S4 (atual)
  const inWindow = (e: XpEventRow) => {
    const diff = daysBetweenDateKeys(getLocalDateKey(new Date(e.created_at)), todayKey);
    return diff >= 0 && diff <= 27;
  };
  for (const e of events) {
    if (!inWindow(e)) continue;
    const diff = daysBetweenDateKeys(getLocalDateKey(new Date(e.created_at)), todayKey);
    const idx = 3 - Math.floor(diff / 7); // diff 0 → S4 (idx 3)
    buckets[idx] += e.amount;
  }
  const series: XpPoint[] = buckets.map((xp, i) => ({ label: `S${i + 1}`, xp }));
  return windowTotals(events, inWindow, series);
}

/** Série mensal (últimos 12 meses) a partir dos eventos. */
function yearlyMetrics(events: XpEventRow[], today: Date) {
  const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const order: string[] = [];
  const sums = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const k = keyOf(d);
    order.push(k);
    sums.set(k, 0);
  }
  const allowed = new Set(order);
  const inWindow = (e: XpEventRow) => allowed.has(keyOf(new Date(e.created_at)));
  for (const e of events) {
    const k = keyOf(new Date(e.created_at));
    if (allowed.has(k)) sums.set(k, (sums.get(k) ?? 0) + e.amount);
  }
  const series: XpPoint[] = order.map((k) => {
    const month = Number(k.split("-")[1]);
    return { label: MONTH_SHORT[month], xp: sums.get(k) ?? 0 };
  });
  return windowTotals(events, inWindow, series);
}

/** XP no período (soma) + missões concluídas (eventos 'gain' no período). */
function windowTotals(
  events: XpEventRow[],
  inWindow: (e: XpEventRow) => boolean,
  series: XpPoint[],
) {
  let xpInPeriod = 0;
  let missionsCompleted = 0;
  for (const e of events) {
    if (!inWindow(e)) continue;
    xpInPeriod += e.amount;
    if (e.kind === "gain") missionsCompleted += 1;
  }
  return { series, xpInPeriod: Math.max(0, xpInPeriod), missionsCompleted };
}

const META: Record<MetricsPeriod, { chartTitle: string; seriesAxisLabel: string }> = {
  Semanal: { chartTitle: "XP por dia", seriesAxisLabel: "Últimos 7 dias" },
  Mensal: { chartTitle: "XP por semana", seriesAxisLabel: "Últimas 4 semanas" },
  Anual: { chartTitle: "XP por mês", seriesAxisLabel: "Últimos 12 meses" },
};

interface UseMetricsArgs {
  /** missões do usuário (snapshot, para conclusão por categoria). */
  missions: Mission[];
  /** maior streak já atingido (profile.best_streak). */
  bestStreak: number;
}

/**
 * Métricas reais por período, derivadas do log `xp_events` (XP/missões ao longo
 * do tempo) e do snapshot de missões (conclusão por categoria). Conta nova =
 * tudo zerado; cresce conforme o usuário conclui missões.
 */
export function useMetrics({ missions, bestStreak }: UseMetricsArgs) {
  const [events, setEvents] = useState<XpEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getXpEvents()
      .then((rows) => {
        if (active) setEvents(rows);
      })
      .catch((e) => console.error("Erro ao carregar eventos de XP:", e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const byPeriod = useMemo<Record<MetricsPeriod, PeriodMetrics>>(() => {
    const today = startOfDay(new Date());
    const todayKey = getLocalDateKey(today);
    const categories = categoriesFromMissions(missions);
    const completionRate = completionRateFromMissions(missions);

    const build = (
      period: MetricsPeriod,
      totals: ReturnType<typeof windowTotals>,
    ): PeriodMetrics => ({
      xpInPeriod: totals.xpInPeriod,
      missionsCompleted: totals.missionsCompleted,
      completionRate,
      longestStreak: bestStreak,
      chartTitle: META[period].chartTitle,
      seriesAxisLabel: META[period].seriesAxisLabel,
      series: totals.series,
      categories,
    });

    return {
      Semanal: build("Semanal", weeklyMetrics(events, todayKey, today)),
      Mensal: build("Mensal", monthlyMetrics(events, todayKey)),
      Anual: build("Anual", yearlyMetrics(events, today)),
    };
  }, [events, missions, bestStreak]);

  return { byPeriod, loading };
}
