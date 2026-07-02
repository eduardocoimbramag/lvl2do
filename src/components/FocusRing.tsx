"use client";

import { motion } from "framer-motion";
import { formatClock } from "@/data/focus";
import { cn } from "@/lib/utils";

interface FocusRingProps {
  /** segundos restantes (mostrados no centro). */
  remaining: number;
  /** fração concluída [0..1]. */
  progress: number;
  /** rótulo abaixo do tempo (ex.: nome da sessão ou estado). */
  label?: string;
  /** estado visual (pausado esmaece levemente). */
  paused?: boolean;
  /** diâmetro do anel em px (padrão 260). */
  size?: number;
  /** estado ocioso (antes de iniciar) — mostra "Pronto" mais discreto. */
  idle?: boolean;
  className?: string;
}

const STROKE = 14;

/**
 * Anel circular de progresso do Modo Foco. O arco preenche conforme o tempo
 * passa (gradiente da marca), com o tempo restante grande no centro.
 */
export function FocusRing({
  remaining,
  progress,
  label,
  paused,
  size = 260,
  idle,
  className,
}: FocusRingProps) {
  const SIZE = size;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const dashOffset = CIRC * (1 - progress);

  // Dimensiona a fonte pelo comprimento do texto para que "01:00:00" (HH:MM:SS)
  // e "15:00" (MM:SS) fiquem proporcionais e NUNCA transbordem o anel.
  // Com tabular-nums cada caractere ≈ 0.58em; usamos ~78% do diâmetro interno.
  const clock = formatClock(remaining);
  const innerWidth = SIZE - STROKE * 2; // espaço útil dentro do trilho
  const fontSize = Math.min(
    SIZE * 0.24, // teto: textos curtos não ficam gigantes
    (innerWidth * 0.82) / (clock.length * 0.58),
  );

  return (
    <div className={cn("relative", className)} style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        aria-hidden
      >
        <defs>
          <linearGradient id="focus-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
        </defs>

        {/* trilho */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={STROKE}
        />

        {/* progresso */}
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#focus-ring-gradient)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.4, ease: "linear" }}
          style={{ filter: "drop-shadow(0 0 6px rgba(168,85,247,0.45))" }}
        />
      </svg>

      {/* tempo + rótulo no centro */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
        <span
          style={{ fontSize, lineHeight: 1 }}
          className={cn(
            "font-display font-bold tabular-nums tracking-tight transition-opacity",
            idle ? "text-soft/70" : "text-soft",
            paused && "opacity-50",
          )}
        >
          {clock}
        </span>
        {label && (
          <span className="mt-2 max-w-[12rem] truncate text-center text-sm text-muted">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
