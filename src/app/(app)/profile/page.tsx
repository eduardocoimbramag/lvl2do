"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, CheckCircle2, Flame, Trophy, Calendar, Repeat } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { CategoryBadge } from "@/components/CategoryBadge";
import { AnimatedGrid } from "@/components/Section";
import { Button } from "@/components/Button";
import { ChangeClassModal } from "@/components/ChangeClassModal";
import { useAppStats } from "@/hooks/AppStateProvider";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { userProfile, totals, categoryProgress } from "@/data/mockStats";

export default function ProfilePage() {
  const { stats, progress } = useAppStats();
  const { characterClass } = useCharacterClass();
  const [classModalOpen, setClassModalOpen] = useState(false);

  return (
    <>
      <PageHeader title="Perfil" subtitle="Suas estatísticas e conquistas." />

      {/* card de perfil */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-surface relative overflow-hidden p-6 sm:p-8"
      >
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-brand-gradient font-display text-4xl font-bold text-white shadow-glow">
            {userProfile.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold text-soft">{userProfile.name}</h2>
            <p className="mt-1 text-sm text-brand-light">
              Nível {progress.level} — {userProfile.title}
            </p>
            {characterClass && (
              <p className="mt-0.5 text-sm text-soft">
                Classe: <span className="font-medium text-brand-light">{characterClass}</span>
              </p>
            )}
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
              <Calendar size={13} /> Membro desde {userProfile.joinedAt}
            </p>

            <div className="mt-4 max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-muted">Progresso de nível</span>
                <span className="text-soft">
                  {progress.xpIntoLevel} / {progress.xpForNextLevel} XP
                </span>
              </div>
              <ProgressBar value={progress.xpIntoLevel} max={progress.xpForNextLevel} />
            </div>
          </div>

          {/* ações da conta */}
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
            {/* FUTURO CLERK: substituir por <UserButton /> / gestão de conta */}
            <Button variant="secondary" className="w-full sm:w-auto">
              Editar perfil
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setClassModalOpen(true)}
            >
              <Repeat size={16} /> Trocar classe
            </Button>
          </div>
        </div>
      </motion.div>

      <ChangeClassModal open={classModalOpen} onClose={() => setClassModalOpen(false)} />

      {/* estatísticas */}
      <AnimatedGrid className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="XP total" value={stats.totalXp.toLocaleString("pt-BR")} icon={Zap} />
        <StatCard label="Missões concluídas" value={totals.missionsCompleted} icon={CheckCircle2} />
        <StatCard label="Streak atual" value={`${userProfile.streak} dias`} icon={Flame} />
        <StatCard
          label="Maior streak"
          value={`${userProfile.longestStreak} dias`}
          icon={Trophy}
          tone="success"
        />
      </AnimatedGrid>

      {/* desempenho por categoria */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="card-surface mt-5 p-6"
      >
        <h3 className="mb-5 font-display font-semibold text-soft">Desempenho por categoria</h3>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
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
    </>
  );
}
