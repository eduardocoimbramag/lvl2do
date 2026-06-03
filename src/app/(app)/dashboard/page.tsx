"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Target, TrendingUp, Trophy, ArrowRight, ArrowDownRight, Moon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LevelCard } from "@/components/LevelCard";
import { CompletionCard } from "@/components/CompletionCard";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { DailyXpCard } from "@/components/DailyXpCard";
import { MissionCard } from "@/components/MissionCard";
import { Button, ButtonLink } from "@/components/Button";
import { AnimatedGrid } from "@/components/Section";
import { CategoryBadge } from "@/components/CategoryBadge";
import { useAppStats, useAppMissions } from "@/hooks/AppStateProvider";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { CATEGORIES } from "@/data/types";
import { userProfile } from "@/data/mockStats";

export default function DashboardPage() {
  // estado global compartilhado — concluir missão credita XP em tempo real
  const { stats, progress, daily, simulateInactiveDays } = useAppStats();
  const { missions, toggle } = useAppMissions();
  const { characterClass } = useCharacterClass();

  const todayMissions = missions.slice(0, 5);
  const doneToday = missions.filter((m) => m.status === "done").length;

  // progresso diário: % de missões de hoje concluídas
  const dailyProgress = useMemo(
    () => (missions.length === 0 ? 0 : Math.round((doneToday / missions.length) * 100)),
    [doneToday, missions.length],
  );

  // conclusão por categoria (hoje) + total — para o card "Conclusão do dia"
  const completion = useMemo(() => {
    const perCategory = CATEGORIES.map((category) => {
      const inCat = missions.filter((m) => m.category === category);
      const done = inCat.filter((m) => m.status === "done").length;
      const value = inCat.length === 0 ? 0 : Math.round((done / inCat.length) * 100);
      return { category, value, completion: value };
    });
    const total = missions.length === 0 ? 0 : Math.round((doneToday / missions.length) * 100);

    // linhas do card, na ordem pedida: Profissional, Pessoal, Saúde, Total
    const rows = [
      ...CATEGORIES.map((category) => ({
        label: category,
        value: perCategory.find((c) => c.category === category)?.value ?? 0,
      })),
      { label: "Total", value: total },
    ];

    // mais forte = maior conclusão; mais fraca = menor conclusão
    const sorted = [...perCategory].sort((a, b) => b.completion - a.completion);
    return { rows, strongest: sorted[0], weakest: sorted[sorted.length - 1] };
  }, [missions, doneToday]);

  const strongestArea = completion.strongest;
  const weakestArea = completion.weakest;

  return (
    <>
      <PageHeader
        title={`Bem-vindo de volta, ${userProfile.name}`}
        subtitle="Aqui está o resumo da sua evolução."
      />

      {/* linha 1: nível + conclusão do dia */}
      <div className="grid gap-5 lg:grid-cols-3">
        <LevelCard
          level={progress.level}
          xpCurrent={progress.xpIntoLevel}
          xpToNext={progress.xpForNextLevel}
          characterClass={characterClass}
          className="lg:col-span-2"
        />
        <CompletionCard rows={completion.rows} />
      </div>

      {/* linha 2: stat cards */}
      <AnimatedGrid className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Missões concluídas hoje"
          value={`${doneToday}/${missions.length}`}
          hint="Continue assim!"
          icon={Target}
        />
        <StatCard
          label="XP total"
          value={stats.totalXp.toLocaleString("pt-BR")}
          hint={`Nível ${progress.level}`}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="XP até o próximo nível"
          value={`${progress.xpForNextLevel - progress.xpIntoLevel}`}
          hint="Continue evoluindo!"
          icon={Trophy}
        />
      </AnimatedGrid>

      {/* linha: XP diário (limite) + progresso diário */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <DailyXpCard
          used={daily.used}
          limit={daily.limit}
          nearLimit={daily.nearLimit}
          reachedLimit={daily.reachedLimit}
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card-surface p-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-semibold text-soft">Progresso diário</h3>
            <span className="text-sm text-muted">
              {doneToday}/{missions.length} missões · {dailyProgress}%
            </span>
          </div>
          <ProgressBar value={dailyProgress} tone="success" />
        </motion.div>
      </div>

      {/* linha 3: missões do dia + áreas */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* missões do dia */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-semibold text-soft">Missões do dia</h3>
            <Link href="/missions" className="inline-flex items-center gap-1 text-sm text-brand-light hover:text-brand-vivid">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          <AnimatedGrid className="grid gap-4 sm:grid-cols-2">
            {todayMissions.map((m) => (
              <MissionCard key={m.id} mission={m} onToggle={toggle} />
            ))}
          </AnimatedGrid>
        </div>

        {/* áreas + ações */}
        <div className="space-y-5">
          <div className="card-glow p-5">
            <p className="text-xs uppercase tracking-widest text-muted">Área mais forte</p>
            <div className="mt-3 flex items-center justify-between">
              <CategoryBadge category={strongestArea.category} />
              <span className="font-display text-2xl font-bold text-success">
                {strongestArea.completion}%
              </span>
            </div>
            <ProgressBar value={strongestArea.completion} tone="success" className="mt-3" size="sm" />
          </div>

          <div className="card-glow p-5">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted">
              <ArrowDownRight size={13} /> Área mais fraca
            </p>
            <div className="mt-3 flex items-center justify-between">
              <CategoryBadge category={weakestArea.category} />
              <span className="font-display text-2xl font-bold text-rose-300">
                {weakestArea.completion}%
              </span>
            </div>
            <ProgressBar value={weakestArea.completion} className="mt-3" size="sm" />
          </div>

          <div className="flex flex-col gap-3">
            <ButtonLink href="/missions" className="w-full">
              <Plus size={18} /> Nova missão
            </ButtonLink>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => simulateInactiveDays(1)}
              title="Aplica a perda de XP de 1 dia inativo (demonstração)"
            >
              <Moon size={16} /> Simular dia inativo
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
