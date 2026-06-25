"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ProgressBar } from "./ProgressBar";
import { XpBolt } from "./AnimatedSvgIcon";
import { StreakIndicator } from "./StreakIndicator";
import { getCharacterImage, isCharacterClass } from "@/data/characterClasses";
import { cn } from "@/lib/utils";

interface LevelCardProps {
  level: number;
  xpCurrent: number;
  xpToNext: number;
  /** nome completo do usuário (nome + sobrenome) exibido acima do nível. */
  displayName?: string | null;
  /** classe de personagem escolhida (ex.: "Arqueira"); opcional. */
  characterClass?: string | null;
  /**
   * Arte já resolvida (respeitando a skin escolhida). Quando informada, tem
   * prioridade sobre a derivação automática pelo nível. Opcional.
   */
  artSrc?: string | null;
  /**
   * Dias consecutivos de streak (sequência). Quando informado, mostra o
   * indicador de streak no canto superior direito. Opcional.
   */
  streakDays?: number;
  className?: string;
}

/**
 * Card de nível atual: moldura com a arte do personagem à esquerda e o
 * conteúdo (nível, classe e barra de XP) à direita.
 */
export function LevelCard({
  level,
  xpCurrent,
  xpToNext,
  displayName,
  characterClass,
  artSrc: artSrcProp,
  streakDays,
  className,
}: LevelCardProps) {
  // arte: prioriza a skin resolvida vinda de fora; senão, deriva do nível.
  const artSrc =
    artSrcProp ??
    (isCharacterClass(characterClass) ? getCharacterImage(characterClass, level) : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "card-surface relative flex h-full items-center gap-5 p-5 sm:gap-6 sm:p-6",
        className,
      )}
    >
      {/* glow decorativo (clipado pelo próprio layer p/ não vazar o card) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/20 blur-3xl" />
      </div>

      {/* indicador de streak — canto superior direito */}
      {streakDays !== undefined && (
        <StreakIndicator days={streakDays} className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5" />
      )}

      {/* moldura com a arte do personagem */}
      <div className="relative aspect-square w-36 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-ink shadow-glow sm:w-44">
        {artSrc ? (
          <Image
            src={artSrc}
            alt={`Classe ${characterClass}`}
            fill
            sizes="(max-width: 640px) 9rem, 11rem"
            className="object-cover"
          />
        ) : (
          // sem classe ainda → mostra o nível na moldura
          <div className="flex h-full w-full items-center justify-center bg-brand-gradient text-white">
            <span className="font-display text-5xl font-bold">{level}</span>
          </div>
        )}
      </div>

      {/* conteúdo à direita — distribuído na altura do card */}
      <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-5">
        <div className={cn(streakDays !== undefined && "pr-16 sm:pr-20")}>
          <p className="text-xs uppercase tracking-widest text-muted">Nível atual</p>
          {displayName && (
            <h3 className="truncate font-display text-xl font-semibold text-soft sm:text-2xl">
              {displayName}
            </h3>
          )}
          <p
            className={cn(
              "truncate font-display font-semibold text-soft",
              displayName ? "text-sm text-brand-light sm:text-base" : "text-xl sm:text-2xl",
            )}
          >
            Nível {level}
          </p>
          {characterClass && (
            <p className="mt-1 truncate text-sm text-brand-light sm:text-base">
              Classe: <span className="font-medium">{characterClass}</span>
            </p>
          )}
        </div>

        {/* barra de XP */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs sm:text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <XpBolt size={15} /> XP
            </span>
            <span className="font-medium text-soft">
              {xpCurrent} / {xpToNext} XP
            </span>
          </div>
          <ProgressBar value={xpCurrent} max={xpToNext} />
          <p className="mt-1.5 text-xs text-muted">
            Faltam <span className="text-brand-light">{xpToNext - xpCurrent} XP</span> para o próximo nível.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
