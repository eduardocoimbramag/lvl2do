"use client";

import { motion } from "framer-motion";
import { METRICS_PERIODS, type MetricsPeriod } from "@/data/metricsData";
import { cn } from "@/lib/utils";

interface MetricsPeriodToggleProps {
  value: MetricsPeriod;
  onChange: (p: MetricsPeriod) => void;
}

/** Seletor de período das métricas: Semanal / Mensal / Anual. */
export function MetricsPeriodToggle({ value, onChange }: MetricsPeriodToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.06] bg-ink-card/60 p-1">
      {METRICS_PERIODS.map((p) => {
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-pressed={active}
            className={cn(
              "relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-4",
              active ? "text-soft" : "text-muted hover:text-soft",
            )}
          >
            {active && (
              <motion.span
                layoutId="metrics-period-active"
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
