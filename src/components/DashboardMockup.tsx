"use client";

import { motion } from "framer-motion";
import { Check, Flame, Trophy, Zap } from "lucide-react";
import { OrbitDecor } from "./AnimatedSvgIcon";

/**
 * Mockup visual do dashboard exibido no hero da landing page.
 * Mostra XP, nível, streak e missões de forma estática/animada.
 */
export function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <OrbitDecor className="-m-10" />

      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="card-surface relative overflow-hidden p-5 shadow-glow"
      >
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand/25 blur-3xl" />

        {/* topo: nível + xp */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient font-display text-lg font-bold text-white shadow-glow-sm">
            4
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted">Executor em Evolução</p>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-soft">340 / 500 XP</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-brand-gradient"
                initial={{ width: 0 }}
                animate={{ width: "68%" }}
                transition={{ duration: 1.2, delay: 0.6 }}
              />
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: Flame, label: "Streak", value: "5d" },
            { icon: Zap, label: "XP hoje", value: "85" },
            { icon: Trophy, label: "Missões", value: "4/7" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 text-center"
            >
              <s.icon size={15} className="mx-auto text-brand-light" />
              <p className="mt-1 font-display text-sm font-bold text-soft">{s.value}</p>
              <p className="text-[10px] text-muted">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* missões */}
        <div className="relative mt-4 space-y-2">
          {MOCK_TASKS.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.12 }}
              className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <span
                className={`flex h-4.5 w-4.5 items-center justify-center rounded-full ${
                  t.done ? "bg-success/20 text-success" : "border border-white/20 text-transparent"
                }`}
                style={{ width: 18, height: 18 }}
              >
                <Check size={11} />
              </span>
              <span className={`flex-1 text-xs ${t.done ? "text-muted line-through" : "text-soft"}`}>
                {t.label}
              </span>
              <span className="text-[10px] font-semibold text-brand-light">+{t.xp}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* badge "level up" flutuante */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.4, type: "spring", stiffness: 200 }}
        className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-2xl border border-brand/30 bg-ink-card/90 px-3 py-2 shadow-glow backdrop-blur"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient">
          <Trophy size={14} className="text-white" />
        </span>
        <div className="text-xs">
          <p className="font-semibold text-soft">Level up!</p>
          <p className="text-[10px] text-muted">Nível 4 alcançado</p>
        </div>
      </motion.div>
    </div>
  );
}

const MOCK_TASKS = [
  { label: "Estudar System Design", done: true, xp: 25 },
  { label: "Treino de força", done: false, xp: 50 },
  { label: "Revisar PRs do time", done: true, xp: 10 },
];
