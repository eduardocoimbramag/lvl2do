"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { Plus, Target, ArrowRight, Quote, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LevelCard } from "@/components/LevelCard";
import { CompletionCard } from "@/components/CompletionCard";
import { DailyXpCard } from "@/components/DailyXpCard";
import { MissionCard } from "@/components/MissionCard";
import { ButtonLink } from "@/components/Button";
import { AnimatedGrid } from "@/components/Section";
import { useAppStats, useAppMissions } from "@/hooks/AppStateProvider";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { useCharacterSkin } from "@/hooks/useCharacterSkin";
import { isCharacterClass } from "@/data/characterClasses";
import { CATEGORIES } from "@/data/types";
import { userProfile } from "@/data/mockStats";

export default function DashboardPage() {
  // estado global compartilhado — concluir missão credita XP em tempo real
  const { progress, daily } = useAppStats();
  const { missions, toggle } = useAppMissions();
  const { characterClass } = useCharacterClass();
  const { resolveImage } = useCharacterSkin();
  const { user } = useUser();

  // nome completo (nome + sobrenome) do usuário, com fallbacks
  const fullName =
    user?.fullName || user?.firstName || user?.username || userProfile.name;

  // arte do personagem respeitando a skin escolhida (auto/manual)
  const characterArt = isCharacterClass(characterClass)
    ? resolveImage(characterClass, progress.level)
    : null;

  // missões pendentes de hoje (para o bloco "Missões pendentes")
  const pendingMissions = missions.filter((m) => m.status === "pending");
  const doneToday = missions.filter((m) => m.status === "done").length;

  // conclusão por categoria (hoje) + total — para o card "Conclusão do dia"
  const completionRows = useMemo(() => {
    const total = missions.length === 0 ? 0 : Math.round((doneToday / missions.length) * 100);
    // ordem pedida: Profissional, Pessoal, Saúde, Total
    return [
      ...CATEGORIES.map((category) => {
        const inCat = missions.filter((m) => m.category === category);
        const done = inCat.filter((m) => m.status === "done").length;
        const value = inCat.length === 0 ? 0 : Math.round((done / inCat.length) * 100);
        return { label: category, value };
      }),
      { label: "Total", value: total },
    ];
  }, [missions, doneToday]);

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
          displayName={fullName}
          characterClass={characterClass}
          artSrc={characterArt}
          className="lg:col-span-2"
        />
        <CompletionCard rows={completionRows} />
      </div>

      {/* linha 2: missões hoje (1/4) + XP diário (1/4) + frase do dia (2/4) */}
      <div className="mt-5 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* missões concluídas hoje — mesmo padrão dos cards ao lado */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card-surface flex h-full flex-col p-6"
        >
          <h3 className="inline-flex items-center gap-2 font-display font-semibold text-soft">
            <Target size={16} className="text-brand-light" /> Missões concluídas
          </h3>
          <div className="flex flex-1 items-center">
            <p className="font-display text-4xl font-bold text-soft">
              {doneToday}/{missions.length}
            </p>
          </div>
        </motion.div>

        <DailyXpCard
          used={daily.used}
          limit={daily.limit}
          nearLimit={daily.nearLimit}
          reachedLimit={daily.reachedLimit}
          className="h-full"
        />

        {/* frase do dia (placeholder fixo por enquanto) — ocupa 2/4 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card-surface flex h-full flex-col p-6 sm:col-span-2"
        >
          <h3 className="inline-flex items-center gap-2 font-display font-semibold text-soft">
            <Quote size={16} className="text-brand-light" /> Frase do dia
          </h3>
          <blockquote className="mt-3 flex flex-1 flex-col justify-center">
            <p className="font-display text-sm italic leading-relaxed text-soft">
              “Sem saber que era impossível, ele foi lá e fez!”
            </p>
            <footer className="mt-2 text-xs text-muted">— Autor desconhecido</footer>
          </blockquote>
        </motion.div>
      </div>

      {/* linha 3: missões pendentes (largura cheia, 3 colunas) */}
      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display font-semibold text-soft">Missões pendentes</h3>
          <Link href="/missions" className="inline-flex items-center gap-1 text-sm text-brand-light hover:text-brand-vivid">
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>

        {pendingMissions.length > 0 ? (
          <AnimatedGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingMissions.map((m) => (
              <MissionCard key={m.id} mission={m} onToggle={toggle} />
            ))}
          </AnimatedGrid>
        ) : (
          <div className="card-surface flex flex-col items-center gap-3 p-12 text-center">
            <CheckCircle2 className="text-success" size={32} />
            <p className="text-sm text-muted">Nenhuma missão pendente por hoje. Bom trabalho!</p>
            <ButtonLink href="/missions" variant="secondary">
              <Plus size={16} /> Nova missão
            </ButtonLink>
          </div>
        )}
      </div>
    </>
  );
}
