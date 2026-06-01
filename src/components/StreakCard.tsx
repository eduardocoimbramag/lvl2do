"use client";

import { motion } from "framer-motion";
import { StreakFlame } from "./AnimatedSvgIcon";
import { cn } from "@/lib/utils";

interface StreakCardProps {
  days: number;
  className?: string;
}

/** Card de streak diário com os últimos 7 dias representados. */
export function StreakCard({ days, className }: StreakCardProps) {
  const week = Array.from({ length: 7 }, (_, i) => i < days % 7 || (days >= 7 && i < 7));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className={cn("card-glow p-6", className)}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Sequência</p>
          <p className="mt-1 font-display text-3xl font-bold text-soft">
            {days} <span className="text-base font-medium text-muted">dias</span>
          </p>
        </div>
        <StreakFlame size={34} />
      </div>

      <div className="mt-5 flex items-center gap-1.5">
        {week.map((active, i) => (
          <motion.span
            key={i}
            initial={{ scaleY: 0.4, opacity: 0.4 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className={cn(
              "h-7 flex-1 rounded-md",
              active ? "bg-brand-gradient shadow-glow-sm" : "bg-white/[0.06]",
            )}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Mantenha o ritmo para não perder a sequência. 🔥</p>
    </motion.div>
  );
}
