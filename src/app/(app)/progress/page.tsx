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
import { useAuth } from "@/components/AuthProvider";
import { isDevUser } from "@/lib/devAccess";
import { useAppStats, useAppMissions } from "@/hooks/AppStateProvider";
import { useMetrics } from "@/hooks/useMetrics";
import { strongestOf, weakestOf, type MetricsPeriod } from "@/data/metricsData";

/** Sufixo do rótulo dos cards conforme o período (ex.: "na semana"). */
const PERIOD_SUFFIX: Record<MetricsPeriod, string> = {
  Semanal: "na semana",
  Mensal: "no mês",
  Anual: "no ano",
};

export default function ProgressPage() {
  const [period, setPeriod] = useState<MetricsPeriod>("Semanal");

  // dados reais: XP/missões ao longo do tempo (xp_events) + conclusão por
  // categoria (snapshot das missões do usuário).
  const { user } = useAuth();
  const { bestStreak } = useAppStats();
  const { allMissions } = useAppMissions();
  const { byPeriod, loading, error, debug } = useMetrics({
    userId: user?.id ?? null,
    missions: allMissions,
    bestStreak,
  });

  const data = byPeriod[period];
  const strongest = strongestOf(data.categories);
  const weakest = weakestOf(data.categories);
  const suffix = PERIOD_SUFFIX[period];
  const hasData = data.categories.some((c) => c.completion > 0);

  return (
    <>
      <PageHeader
        title="Métricas"
        subtitle="Acompanhe sua evolução ao longo do tempo."
        action={<MetricsPeriodToggle value={period} onChange={setPeriod} />}
      />

      {/* Painel de diagnóstico — SOMENTE para e-mails de dev (ver isDevUser).
          Temporário: existe para responder "o dado chegou no navegador?" sem
          precisar do DevTools. Some sozinho para qualquer outro usuário, e pode
          ser apagado junto com o campo `debug` do useMetrics quando a questão
          estiver encerrada. */}
      {isDevUser(user?.email) && (
        <details className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs">
          <summary className="cursor-pointer font-medium text-muted">
            Diagnóstico das métricas (só você vê isto)
          </summary>
          <dl className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {[
              ["estado da busca", debug.loading ? "CARREGANDO (não terminou)" : "concluída"],
              ["deu erro?", debug.error ? "SIM — veja o aviso amarelo" : "não"],
              ["userId usado", debug.userId ?? "NULO — a busca nem começou"],
              ["eventos recebidos", String(debug.total)],
              ["conclusões entre eles", String(debug.concluidas)],
              [
                "intervalo dos eventos",
                debug.primeiro ? `${debug.primeiro} → ${debug.ultimo}` : "—",
              ],
              ["XP calculado (período atual)", String(data.xpInPeriod)],
              ["missões calculadas (período atual)", String(data.missionsCompleted)],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="flex gap-2">
                <dt className="shrink-0 text-muted">{rotulo}:</dt>
                <dd className="min-w-0 break-all font-medium text-soft">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 leading-relaxed text-muted">
            Esperado para a sua conta: <strong className="text-soft">31 eventos</strong>, de
            10/07/2026 a 04/09/2026, com <strong className="text-soft">24 conclusões</strong>. Se
            &quot;eventos recebidos&quot; for 0 e não houver erro, o dado não está chegando ao
            navegador. Se for 31 e os cards mostrarem 0, o problema é no cálculo.
          </p>
        </details>
      )}

      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
        >
          Não foi possível carregar seu histórico de XP. Os números por período podem estar
          incompletos — recarregue a página para tentar de novo.
        </p>
      )}

      {/* Enquanto o histórico não chega, os cards mostrariam "0" — igualzinho a
          uma conta sem nenhuma missão concluída. Foi essa ambiguidade que fez o
          problema demorar tanto a ser cercado. Um aviso curto separa as duas
          coisas em vez de deixar o zero mentir. */}
      {loading && (
        <p className="mb-5 text-xs text-muted">Carregando seu histórico de XP…</p>
      )}

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
          hint="Conclusão geral"
          icon={Percent}
          tone="success"
        />
        <StatCard
          label="Maior streak"
          value={`${data.longestStreak} dias`}
          hint="Recorde geral"
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
          <div className="space-y-4">
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
          {hasData && strongest && weakest ? (
            <>
              <p className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-muted">
                Sua área mais forte é{" "}
                <span className="font-medium text-success">{strongest.category}</span>, com{" "}
                <span className="font-medium text-success">{strongest.completion}%</span> de conclusão.
              </p>
              <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-muted">
                Sua área mais fraca é{" "}
                <span className="font-medium text-brand-light">{weakest.category}</span>, com{" "}
                <span className="font-medium text-brand-light">{weakest.completion}%</span>. Tente criar
                pequenas missões nessa categoria para equilibrar sua evolução.
              </p>
            </>
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-muted">
              Conclua suas primeiras missões para desbloquear a análise de desempenho por categoria.
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
}
