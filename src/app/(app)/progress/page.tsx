"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, CheckCircle2, Percent, Flame, Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { CategoryBadge } from "@/components/CategoryBadge";
import { AnimatedGrid } from "@/components/Section";
import { XpAreaChart } from "@/components/charts/XpAreaChart";
import { MetricsPeriodToggle } from "@/components/MetricsPeriodToggle";
import {
  metricsByPeriod,
  strongestCategory,
  weakestCategory,
  type MetricsPeriod,
} from "@/data/metricsData";

/** Sufixo do rótulo dos cards conforme o período (ex.: "na semana"). */
const PERIOD_SUFFIX: Record<MetricsPeriod, string> = {
  Semanal: "na semana",
  Mensal: "no mês",
  Anual: "no ano",
};

export default function ProgressPage() {
  const [period, setPeriod] = useState<MetricsPeriod>("Semanal");

  // todos os dados da página derivam do período selecionado
  const data = metricsByPeriod[period];
  const strongest = strongestCategory(period);
  const weakest = weakestCategory(period);
  const suffix = PERIOD_SUFFIX[period];

  return (
    <>
      <PageHeader
        title="Métricas"
        subtitle="Acompanhe sua evolução ao longo do tempo."
        action={<MetricsPeriodToggle value={period} onChange={setPeriod} />}
      />

      {/* stats principais — reagem ao período */}
      <AnimatedGrid key={period} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="XP no período"
          value={data.xpInPeriod.toLocaleString("pt-BR")}
          hint={`XP ganho ${suffix}`}
          icon={Zap}
        />
        <StatCard
          label="Missões concluídas"
          value={data.missionsCompleted.toLocaleString("pt-BR")}
          hint={`Concluídas ${suffix}`}
          icon={CheckCircle2}
        />
        <StatCard
          label="Percentual de conclusão"
          value={`${data.completionRate}%`}
          hint={`Taxa ${suffix}`}
          icon={Percent}
          tone="success"
        />
        <StatCard
          label="Maior streak"
          value={`${data.longestStreak} dias`}
          hint={`Recorde ${suffix}`}
          icon={Flame}
        />
      </AnimatedGrid>

      {/* gráfico XP + progresso por categoria */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card-surface p-6 lg:col-span-3"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display font-semibold text-soft">{data.chartTitle}</h3>
            <span className="text-sm text-muted">{data.seriesAxisLabel}</span>
          </div>
          {/* key força a re-animação do gráfico ao trocar de período */}
          <XpAreaChart key={period} data={data.series} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card-surface p-6 lg:col-span-2"
        >
          <h3 className="mb-5 font-display font-semibold text-soft">Progresso por categoria</h3>
          <div key={period} className="space-y-4">
            {data.categories.map((c) => (
              <div key={c.category}>
                <div className="mb-1.5 flex items-center justify-between">
                  <CategoryBadge category={c.category} />
                  <span className="text-sm font-medium text-soft">{c.completion}%</span>
                </div>
                <ProgressBar
                  value={c.completion}
                  size="sm"
                  tone={c.completion >= 70 ? "success" : "brand"}
                />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* análise textual — reage ao período */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="card-surface mt-5 p-6"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand-light">
            <Lightbulb size={16} />
          </span>
          <h3 className="font-display font-semibold text-soft">Análise inteligente</h3>
        </div>
        <div className="mt-4 space-y-3">
          <p className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-muted">
            No período <span className="font-medium text-soft">{period.toLowerCase()}</span>, sua área
            mais forte é{" "}
            <span className="font-medium text-success">{strongest.category}</span>, com{" "}
            <span className="font-medium text-success">{strongest.completion}%</span> de conclusão.
          </p>
          <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-muted">
            Sua área mais fraca é{" "}
            <span className="font-medium text-brand-light">{weakest.category}</span>, com{" "}
            <span className="font-medium text-brand-light">{weakest.completion}%</span>. Tente criar
            pequenas missões nessa categoria para equilibrar sua evolução.
          </p>
        </div>
      </motion.div>
    </>
  );
}
