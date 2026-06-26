"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, Zap, AlertTriangle, Undo2 } from "lucide-react";
import type { StatsFeedback } from "@/hooks/useUserStats";
import { cn } from "@/lib/utils";

interface XpToastProps {
  feedback: StatsFeedback | null;
  onDismiss: () => void;
  /** tempo até sumir (ms) */
  duration?: number;
}

/**
 * Toast unificado de progressão. Mostra:
 * - ganho de XP ("+50 XP"), com avisos de limite diário;
 * - reversão de XP (missão desfeita);
 * - level up / level down.
 */
export function XpToast({ feedback, onDismiss, duration = 3200 }: XpToastProps) {
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [feedback, duration, onDismiss]);

  const view = feedback ? buildView(feedback) : null;

  return (
    <AnimatePresence>
      {feedback && view && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 260 }}
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 md:bottom-8"
        >
          <div className="card-surface flex items-center gap-3 px-5 py-3 shadow-glow">
            <motion.span
              animate={
                view.celebrate
                  ? { rotate: [0, -12, 12, -8, 0], scale: [1, 1.2, 1] }
                  : undefined
              }
              transition={{ duration: 0.7 }}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl text-white",
                view.iconBg,
              )}
            >
              <view.icon size={20} />
            </motion.span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-soft">{view.title}</p>
              <p className="text-xs text-muted">{view.subtitle}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Deriva título/subtítulo/ícone a partir do feedback. */
function buildView(fb: StatsFeedback): {
  title: string;
  subtitle: string;
  icon: typeof Trophy;
  iconBg: string;
  celebrate: boolean;
} {
  // Level up tem prioridade visual.
  if (fb.levelDelta > 0) {
    return {
      title: "Level Up! 🎉",
      subtitle: `Você subiu para o Nível ${fb.level}`,
      icon: Trophy,
      iconBg: "bg-brand-gradient",
      celebrate: true,
    };
  }

  // Reversão de XP (missão desfeita).
  if (fb.kind === "revert") {
    return {
      title: `${fb.xp} XP`,
      subtitle:
        fb.levelDelta < 0
          ? `Missão desfeita · você voltou ao Nível ${fb.level}`
          : "Missão desfeita · XP revertido",
      icon: Undo2,
      iconBg: "bg-muted/60",
      celebrate: false,
    };
  }

  // Ganho de XP.
  if (fb.reachedDailyLimit && fb.xp === 0) {
    return {
      title: "Limite diário atingido",
      subtitle: "A missão foi concluída, mas não gera mais XP hoje.",
      icon: AlertTriangle,
      iconBg: "bg-amber-500/80",
      celebrate: false,
    };
  }

  if (fb.wasCapped) {
    return {
      title: `+${fb.xp} XP`,
      subtitle: `Você recebeu apenas ${fb.xp} XP por causa do limite diário.`,
      icon: AlertTriangle,
      iconBg: "bg-amber-500/80",
      celebrate: false,
    };
  }

  return {
    title: `+${fb.xp} XP`,
    subtitle: "Missão concluída. Continue evoluindo!",
    icon: Zap,
    iconBg: "bg-brand-gradient",
    celebrate: false,
  };
}
