"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type Period = "Hoje" | "Semana" | "Mês";
const PERIODS: Period[] = ["Hoje", "Semana", "Mês"];

interface PeriodToggleProps {
  value: Period;
  onChange: (p: Period) => void;
}

/** Toggle visual de período (dados mockados não mudam — apenas estado visual). */
export function PeriodToggle({ value, onChange }: PeriodToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.06] bg-ink-card/60 p-1">
      {PERIODS.map((p) => {
        const active = value === p;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              "relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-4",
              active ? "text-soft" : "text-muted hover:text-soft",
            )}
          >
            {active && (
              <motion.span
                layoutId="period-active"
                className="absolute inset-0 rounded-lg bg-brand/15 shadow-glow-sm"
                transition={{ type: "spring", damping: 26, stiffness: 320 }}
              />
            )}
            <span className="relative">{p}</span>
          </button>
        );
      })}
    </div>
  );
}
