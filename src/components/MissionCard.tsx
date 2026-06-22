"use client";

import { motion } from "framer-motion";
import { Check, X, Zap } from "lucide-react";
import type { Mission } from "@/data/types";
import { ShiftBadge } from "./CategoryBadge";
import { fadeUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface MissionCardProps {
  mission: Mission;
  /** conclui a missão (ganha XP) — alterna concluída/pendente */
  onToggle?: (id: string) => void;
  /** marca como não concluída (sem XP) — alterna falhada/pendente */
  onFail?: (id: string) => void;
}

/**
 * Card de missão interativo.
 * Concluir/não concluir altera o estado VISUAL do card localmente
 * (a persistência será adicionada futuramente com banco de dados).
 */
export function MissionCard({ mission, onToggle, onFail }: MissionCardProps) {
  const done = mission.status === "done";
  const failed = mission.status === "failed";
  const finished = done || failed;

  return (
    <motion.div
      layout
      variants={fadeUp}
      className={cn(
        "card-glow group relative flex flex-col gap-4 p-5",
        done && "border-success/30 bg-success/[0.03]",
        failed && "border-white/10 bg-white/[0.02] opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <ShiftBadge shift={mission.shift} />
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand-light">
          <Zap size={12} /> {mission.xp} XP
        </span>
      </div>

      <div>
        <h3
          className={cn(
            "font-display text-base font-semibold leading-snug text-soft transition-colors",
            done && "text-muted line-through decoration-success/50",
            failed && "text-muted line-through decoration-muted/50",
          )}
        >
          {mission.title}
        </h3>
        {mission.description && (
          <p className="mt-1 text-sm text-muted">{mission.description}</p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span
          className={cn(
            "text-xs font-medium",
            done ? "text-success" : failed ? "text-muted" : "text-muted",
          )}
        >
          {done ? "Concluída" : failed ? "Não concluída" : "Pendente"}
        </span>

        <div className="flex items-center gap-2">
          {/* Não concluir (sem XP) */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => onFail?.(mission.id)}
            aria-pressed={failed}
            aria-label={failed ? "Marcar como pendente" : "Marcar como não concluída"}
            title={failed ? "Reativar missão" : "Não consegui concluir"}
            className={cn(
              "inline-flex items-center justify-center rounded-lg border p-1.5 transition-all",
              failed
                ? "border-rose-400/40 bg-rose-400/15 text-rose-300"
                : "border-white/10 bg-white/5 text-muted hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-300",
            )}
          >
            <X size={15} />
          </motion.button>

          {/* Concluir (ganha XP) */}
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
      </div>
    </motion.div>
  );
}
