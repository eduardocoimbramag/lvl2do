"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
  size?: number;
}

/** Raio de XP estilizado, com brilho pulsante. */
export function XpBolt({ className, size = 28 }: IconProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-brand-light", className)}
      animate={{ filter: ["drop-shadow(0 0 2px #C084FC)", "drop-shadow(0 0 8px #A855F7)", "drop-shadow(0 0 2px #C084FC)"] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    >
      <path
        d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

/** Chama de streak estilizada (fogo), com leve movimento. */
export function StreakFlame({ className, size = 28 }: IconProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-brand", className)}
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    >
      <path
        d="M12 2c1.5 3 4.5 4.5 4.5 8a4.5 4.5 0 1 1-9 0c0-1.2.4-2.1 1-3 .2 1 .9 1.7 1.8 1.7 1.2 0 1.7-1 1.2-2.3-.6-1.6-.5-3 .5-4.1Z"
        fill="url(#flameGrad)"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      <defs>
        <linearGradient id="flameGrad" x1="12" y1="2" x2="12" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C084FC" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

/** Checklist/missão estilizado com check animado. */
export function ChecklistMark({ className, size = 28 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-success", className)}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <motion.path
        d="m8 12 3 3 5-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </svg>
  );
}

/**
 * Elementos abstratos orbitando — usado ao redor do mockup do dashboard.
 * Anéis girando com pequenos nós luminosos.
 */
export function OrbitDecor({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)} aria-hidden="true">
      <motion.div
        className="absolute inset-0 rounded-full border border-brand/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-brand-light shadow-glow-sm" />
      </motion.div>
      <motion.div
        className="absolute inset-6 rounded-full border border-brand-light/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute top-1/2 -right-1 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand shadow-glow-sm" />
      </motion.div>
    </div>
  );
}
