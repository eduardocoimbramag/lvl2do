"use client";

import { motion } from "framer-motion";
import { Zap, CheckCircle2, Percent, Flame, Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { CategoryBadge } from "@/components/CategoryBadge";
import { AnimatedGrid } from "@/components/Section";
import { XpAreaChart } from "@/components/charts/XpAreaChart";
import { useAppStats } from "@/hooks/AppStateProvider";
import {
  totals,
  categoryProgress,
  strongestArea,
  weakestArea,
} from "@/data/mockStats";

export default function ProgressPage() {
  const { stats } = useAppStats();

  return (
    <>
      <PageHeader
        title="Progresso"
        subtitle="Acompanhe sua evolução ao longo do tempo."
      />

      {/* stats principais */}
      <AnimatedGrid className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="XP total" value={stats.totalXp.toLocaleString("pt-BR")} icon={Zap} />
        <StatCard label="Missões concluídas" value={totals.missionsCompleted} icon={CheckCircle2} />
        <StatCard
          label="Conclusão semanal"
          value={`${totals.weeklyCompletionRate}%`}
          icon={Percent}
          tone="success"
        />
        <StatCard label="Maior streak" value={`${totals.longestStreak} dias`} icon={Flame} />
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
            <h3 className="font-display font-semibold text-soft">XP por semana</h3>
            <span className="text-sm text-muted">Últimas 7 semanas</span>
          </div>
          <XpAreaChart />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card-surface p-6 lg:col-span-2"
        >
          <h3 className="mb-5 font-display font-semibold text-soft">Progresso por categoria</h3>
          <div className="space-y-4">
            {categoryProgress.map((c) => (
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

      {/* análise textual */}
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
            Sua área mais forte é{" "}
            <span className="font-medium text-success">{strongestArea.category}</span>, com{" "}
            <span className="font-medium text-success">{strongestArea.completion}%</span> de conclusão.
          </p>
          <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-muted">
            Sua área mais fraca é{" "}
            <span className="font-medium text-brand-light">{weakestArea.category}</span>, com{" "}
            <span className="font-medium text-brand-light">{weakestArea.completion}%</span>. Tente criar
            pequenas missões nessa categoria para equilibrar sua evolução.
          </p>
        </div>
      </motion.div>
    </>
  );
}
