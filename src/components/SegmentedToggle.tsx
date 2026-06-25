"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SegmentedToggleProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** id único do indicador deslizante (layoutId do Framer Motion). */
  layoutId: string;
  className?: string;
}

/** Controle segmentado genérico (indicador deslizante), no padrão do projeto. */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  className,
}: SegmentedToggleProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-white/[0.06] bg-ink-card/60 p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className={cn(
              "relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-4",
              active ? "text-soft" : "text-muted hover:text-soft",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-brand/15 shadow-glow-sm"
                transition={{ type: "spring", damping: 26, stiffness: 320 }}
              />
            )}
            <span className="relative whitespace-nowrap">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
