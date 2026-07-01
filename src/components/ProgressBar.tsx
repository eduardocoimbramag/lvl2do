"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** valor de 0 a 100 (%) — ou passe value/max */
  value: number;
  max?: number;
  className?: string;
  /** trilho mais fino */
  size?: "sm" | "md";
  /** cor da barra */
  tone?: "brand" | "success";
  showShimmer?: boolean;
}

const tones = {
  brand: "bg-brand-gradient",
  success: "bg-success",
};

/** Barra de progresso animada (preenche ao entrar na tela). */
export function ProgressBar({
  value,
  max = 100,
  className,
  size = "md",
  tone = "brand",
  showShimmer = true,
}: ProgressBarProps) {
  const rawPct = Math.min(100, Math.max(0, (value / max) * 100));
  // garante um mínimo VISÍVEL quando há algum progresso (ex.: 10/300 ≈ 3%),
  // senão a barra some visualmente mesmo com valor > 0.
  const pct = rawPct > 0 && rawPct < 2 ? 2 : rawPct;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-white/[0.06]",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(rawPct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn("relative h-full rounded-full", tones[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {showShimmer && (
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute inset-y-0 -left-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </span>
        )}
      </motion.div>
    </div>
  );
}
