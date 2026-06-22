"use client";

import { motion } from "framer-motion";

/**
 * Background decorativo com gradientes roxos sutis, orbes flutuantes,
 * grid tecnológico e partículas. Puramente visual (aria-hidden).
 */
export function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* grid sutil */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(139,92,246,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(139,92,246,0.08) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />

      {/* orbe roxo topo-direita */}
      <motion.div
        className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand/20 blur-[120px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* orbe lilás esquerda */}
      <motion.div
        className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-brand-light/15 blur-[110px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* partículas sutis */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-brand-light/60"
          style={{ left: p.left, top: p.top }}
          animate={{ y: [0, -18, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// posições fixas (determinístico — evita hydration mismatch)
const PARTICLES = [
  { left: "12%", top: "30%", duration: 7, delay: 0 },
  { left: "28%", top: "65%", duration: 9, delay: 1.5 },
  { left: "48%", top: "20%", duration: 8, delay: 0.8 },
  { left: "67%", top: "55%", duration: 10, delay: 2.2 },
  { left: "82%", top: "35%", duration: 7.5, delay: 1 },
  { left: "90%", top: "70%", duration: 9.5, delay: 0.4 },
];
