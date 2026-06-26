"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Zap, CheckCircle2, Flame, Trophy, Calendar, Repeat, Shirt } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { CategoryBadge } from "@/components/CategoryBadge";
import { AnimatedGrid } from "@/components/Section";
import { Button } from "@/components/Button";
import { ReferralSection } from "@/components/ReferralSection";
import { ChangeClassModal } from "@/components/ChangeClassModal";
import { ChangeOutfitModal } from "@/components/ChangeOutfitModal";
import { EditProfileModal } from "@/components/EditProfileModal";
import { useAuth } from "@/components/AuthProvider";
import { useAppStats, useAppMissions } from "@/hooks/AppStateProvider";
import { useProfileIdentity } from "@/hooks/useProfileIdentity";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { useCharacterSkin } from "@/hooks/useCharacterSkin";
import { isCharacterClass } from "@/data/characterClasses";
import { CATEGORIES } from "@/data/types";
import { userProfile } from "@/data/mockStats";

/** Formata `member_since` (ISO) como "Mês Ano" pt-BR (ex.: "Jun 2026"). */
function formatMemberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${d.getFullYear()}`;
}

export default function ProfilePage() {
  const { profile } = useAuth();
  const { stats, progress, streak, bestStreak } = useAppStats();
  const { allMissions } = useAppMissions();
  const { characterClass } = useCharacterClass();
  const { resolveImage } = useCharacterSkin();
  const identity = useProfileIdentity();
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [outfitModalOpen, setOutfitModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const displayName = identity.displayName ?? userProfile.name;
  // hashtag real (cadastrada) ou a de fallback do mock
  const tag = identity.tag ?? userProfile.tag;
  // "Membro desde" real (profile.member_since), com fallback para o mock
  const memberSince = formatMemberSince(profile?.member_since) ?? userProfile.joinedAt;

  // estatísticas reais derivadas das missões do usuário
  const completedCount = allMissions.filter((m) => m.status === "done").length;
  const categoryRows = CATEGORIES.map((category) => {
    const inCat = allMissions.filter((m) => m.category === category);
    const done = inCat.filter((m) => m.status === "done").length;
    const completion = inCat.length === 0 ? 0 : Math.round((done / inCat.length) * 100);
    return { category, completion };
  });

  // arte do personagem (skin escolhida ou automática pelo nível) para a moldura
  const hasClass = isCharacterClass(characterClass);
  const artSrc = hasClass ? resolveImage(characterClass, progress.level) : null;

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
          {/* moldura com a arte do personagem (igual ao dashboard) */}
          <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-ink shadow-glow sm:h-44 sm:w-44">
            {artSrc ? (
              <Image
                src={artSrc}
                alt={`Classe ${characterClass}`}
                fill
                sizes="(max-width: 640px) 9rem, 11rem"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-brand-gradient font-display text-6xl font-bold text-white">
                {displayName.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold text-soft">
              {displayName}
              {tag && (
                <span className="ml-1.5 align-middle text-lg font-semibold text-muted">
                  #{tag}
                </span>
              )}
            </h2>
            <p className="mt-1 text-sm text-brand-light">Nível {progress.level}</p>
            {characterClass && (
              <p className="mt-0.5 text-sm text-soft">
                Classe: <span className="font-medium text-brand-light">{characterClass}</span>
              </p>
            )}
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
              <Calendar size={13} /> Membro desde {memberSince}
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
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setEditModalOpen(true)}
            >
              Editar perfil
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setClassModalOpen(true)}
            >
              <Repeat size={16} /> Trocar classe
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setOutfitModalOpen(true)}
              disabled={!hasClass}
            >
              <Shirt size={16} /> Trocar roupa
            </Button>
          </div>
        </div>
      </motion.div>

      <EditProfileModal open={editModalOpen} onClose={() => setEditModalOpen(false)} />
      <ChangeClassModal open={classModalOpen} onClose={() => setClassModalOpen(false)} />
      {isCharacterClass(characterClass) && (
        <ChangeOutfitModal
          open={outfitModalOpen}
          onClose={() => setOutfitModalOpen(false)}
          characterClass={characterClass}
          level={progress.level}
        />
      )}

      {/* estatísticas */}
      <AnimatedGrid className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="XP total" value={stats.totalXp.toLocaleString("pt-BR")} icon={Zap} />
        <StatCard label="Missões concluídas" value={completedCount} icon={CheckCircle2} />
        <StatCard label="Streak atual" value={`${streak} dias`} icon={Flame} />
        <StatCard
          label="Maior streak"
          value={`${bestStreak} dias`}
          icon={Trophy}
          tone="success"
        />
      </AnimatedGrid>

      {/* indicações (compacto) */}
      <ReferralSection />

      {/* desempenho por categoria */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="card-surface mt-5 p-6"
      >
        <h3 className="mb-5 font-display font-semibold text-soft">Desempenho por categoria</h3>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {categoryRows.map((c) => (
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
