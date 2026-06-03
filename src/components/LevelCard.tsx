"use client";

import { motion } from "framer-motion";
import { ProgressBar } from "./ProgressBar";
import { XpBolt } from "./AnimatedSvgIcon";
import { cn } from "@/lib/utils";

interface LevelCardProps {
  level: number;
  title: string;
  xpCurrent: number;
  xpToNext: number;
  /** classe de personagem escolhida (ex.: "Arqueira"); opcional. */
  characterClass?: string | null;
  className?: string;
}

/** Card de nível atual com barra de XP animada. */
export function LevelCard({ level, title, xpCurrent, xpToNext, characterClass, className }: LevelCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("card-surface relative overflow-hidden p-6", className)}
    >
      {/* glow decorativo */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/20 blur-3xl" />

      <div className="relative flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <span className="font-display text-2xl font-bold">{level}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted">Nível atual</p>
          <h3 className="truncate font-display text-lg font-semibold text-soft">
            Nível {level} — {title}
          </h3>
          {characterClass && (
            <p className="mt-0.5 truncate text-sm text-brand-light">
              Classe: <span className="font-medium">{characterClass}</span>
            </p>
          )}
        </div>
      </div>

      <div className="relative mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <XpBolt size={16} /> XP
          </span>
          <span className="font-medium text-soft">
            {xpCurrent} / {xpToNext} XP
          </span>
        </div>
        <ProgressBar value={xpCurrent} max={xpToNext} />
        <p className="mt-2 text-xs text-muted">
          Faltam <span className="text-brand-light">{xpToNext - xpCurrent} XP</span> para o próximo nível.
        </p>
      </div>
    </motion.div>
  );
}
