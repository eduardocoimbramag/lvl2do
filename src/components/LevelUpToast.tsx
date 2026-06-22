"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trophy } from "lucide-react";

interface LevelUpToastProps {
  show: boolean;
  level: number;
}

/** Animação mockada de "level up" — exibida ao clicar no botão de demonstração. */
export function LevelUpToast({ show, level }: LevelUpToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 260 }}
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 md:bottom-8"
        >
          <div className="card-surface flex items-center gap-3 px-5 py-3 shadow-glow">
            <motion.span
              animate={{ rotate: [0, -12, 12, -8, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.7 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white"
            >
              <Trophy size={20} />
            </motion.span>
            <div>
              <p className="font-display text-sm font-semibold text-soft">Level up! 🎉</p>
              <p className="text-xs text-muted">Você alcançou o nível {level}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
