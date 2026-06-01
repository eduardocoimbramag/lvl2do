"use client";

import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import type { Mission } from "@/data/types";
import { CategoryBadge, DifficultyBadge } from "./CategoryBadge";
import { fadeUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface MissionCardProps {
  mission: Mission;
  /** alterna status localmente (sem persistência) */
  onToggle?: (id: string) => void;
}

/**
 * Card de missão interativo.
 * O botão de concluir altera o estado VISUAL do card localmente
 * (a persistência será adicionada futuramente com banco de dados).
 */
export function MissionCard({ mission, onToggle }: MissionCardProps) {
  const done = mission.status === "done";

  return (
    <motion.div
      layout
      variants={fadeUp}
      className={cn(
        "card-glow group relative flex flex-col gap-4 p-5",
        done && "border-success/30 bg-success/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={mission.category} />
          <DifficultyBadge difficulty={mission.difficulty} />
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand-light">
          <Zap size={12} /> {mission.xp} XP
        </span>
      </div>

      <div>
        <h3
          className={cn(
            "font-display text-base font-semibold leading-snug text-soft transition-colors",
            done && "text-muted line-through decoration-success/50",
          )}
        >
          {mission.title}
        </h3>
        {mission.description && (
          <p className="mt-1 text-sm text-muted">{mission.description}</p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
        <span
          className={cn(
            "text-xs font-medium",
            done ? "text-success" : "text-muted",
          )}
        >
          {done ? "Concluída" : "Pendente"}
        </span>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => onToggle?.(mission.id)}
          aria-pressed={done}
          aria-label={done ? "Marcar como pendente" : "Concluir missão"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
            done
              ? "border-success/40 bg-success/15 text-success"
              : "border-white/10 bg-white/5 text-soft hover:border-brand/40 hover:bg-brand/10",
          )}
        >
          <motion.span
            initial={false}
            animate={{ scale: done ? 1 : 0.8, opacity: done ? 1 : 0.7 }}
            className="flex h-4 w-4 items-center justify-center rounded-full"
          >
            <Check size={14} />
          </motion.span>
          {done ? "Concluída" : "Concluir"}
        </motion.button>
      </div>
    </motion.div>
  );
}
