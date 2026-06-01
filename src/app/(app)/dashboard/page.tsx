"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Target, TrendingUp, Trophy, ArrowRight, ArrowDownRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PeriodToggle, type Period } from "@/components/PeriodToggle";
import { LevelCard } from "@/components/LevelCard";
import { StreakCard } from "@/components/StreakCard";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { MissionCard } from "@/components/MissionCard";
import { LevelUpToast } from "@/components/LevelUpToast";
import { Button, ButtonLink } from "@/components/Button";
import { AnimatedGrid } from "@/components/Section";
import { CategoryBadge } from "@/components/CategoryBadge";
import { useMissions } from "@/hooks/useMissions";
import { userProfile, dailyOverview, strongestArea, weakestArea } from "@/data/mockStats";

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("Hoje");
  const [showLevelUp, setShowLevelUp] = useState(false);
  const { missions, toggle } = useMissions();

  const todayMissions = missions.slice(0, 5);
  const doneToday = missions.filter((m) => m.status === "done").length;

  function triggerLevelUp() {
    setShowLevelUp(true);
    setTimeout(() => setShowLevelUp(false), 2600);
  }

  return (
    <>
      <PageHeader
        title={`Bem-vindo de volta, ${userProfile.name}`}
        subtitle="Aqui está o resumo da sua evolução."
        action={<PeriodToggle value={period} onChange={setPeriod} />}
      />

      {/* linha 1: nível + streak + stats rápidos */}
      <div className="grid gap-5 lg:grid-cols-3">
        <LevelCard
          level={userProfile.level}
          title={userProfile.title}
          xpCurrent={userProfile.xpCurrent}
          xpToNext={userProfile.xpToNext}
          className="lg:col-span-2"
        />
        <StreakCard days={userProfile.streak} />
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
          label="Progresso semanal"
          value={`${dailyOverview.weeklyProgress}%`}
          hint="vs. semana anterior"
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="XP até o próximo nível"
          value={`${userProfile.xpToNext - userProfile.xpCurrent}`}
          hint="Quase lá!"
          icon={Trophy}
        />
      </AnimatedGrid>

      {/* progresso semanal barra */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="card-surface mt-5 p-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display font-semibold text-soft">Progresso semanal</h3>
          <span className="text-sm text-muted">{dailyOverview.weeklyProgress}% completo</span>
        </div>
        <ProgressBar value={dailyOverview.weeklyProgress} tone="success" />
      </motion.div>

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
            <Button variant="secondary" className="w-full" onClick={triggerLevelUp}>
              <Trophy size={16} /> Simular level up
            </Button>
          </div>
        </div>
      </div>

      <LevelUpToast show={showLevelUp} level={userProfile.level} />
    </>
  );
}
