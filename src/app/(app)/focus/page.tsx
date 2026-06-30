"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Play,
  Pause,
  Square,
  RotateCcw,
  CheckCircle2,
  Zap,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { FocusRing } from "@/components/FocusRing";
import { CategoryBadge, categoryMeta } from "@/components/CategoryBadge";
import { useAppMissions } from "@/hooks/AppStateProvider";
import { useFocusTimer } from "@/hooks/useFocusTimer";
import { useAlarmSound } from "@/hooks/useAlarmSound";
import { FOCUS_PRESETS, FOCUS_XP_REWARD, describeMinutes } from "@/data/focus";
import { CATEGORIES, type Category } from "@/data/types";
import { cn } from "@/lib/utils";

/** Resultado de uma sessão concluída (para a tela de confirmação). */
interface DoneInfo {
  title: string;
  category: Category;
  minutes: number;
  creditedXp: number;
}

export default function FocusPage() {
  const { addCompletedMission } = useAppMissions();
  const { fire } = useAlarmSound();

  // formulário
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Profissional");
  const [minutes, setMinutes] = useState(25);

  // info da sessão concluída (tela de done)
  const [done, setDone] = useState<DoneInfo | null>(null);

  // guarda os dados da sessão em andamento (para registrar ao concluir)
  const activeSession = useRef<{ title: string; category: Category; minutes: number } | null>(null);

  const timer = useFocusTimer({
    onComplete: () => {
      const session = activeSession.current;
      if (!session) return;
      // toca o sino de conclusão
      fire();
      // registra como missão concluída do dia (+XP) na área escolhida
      const creditedXp = addCompletedMission({
        title: session.title,
        category: session.category,
        xp: FOCUS_XP_REWARD,
      });
      setDone({ ...session, creditedXp });
      activeSession.current = null;
    },
  });

  function handleStart() {
    if (!title.trim()) return;
    activeSession.current = { title: title.trim(), category, minutes };
    setDone(null);
    timer.start(minutes);
  }

  function handleStop() {
    timer.reset();
    activeSession.current = null;
  }

  function handleNewSession() {
    setDone(null);
    timer.acknowledgeDone();
    setTitle("");
  }

  const showForm = timer.phase === "idle" && !done;
  const showTimer = timer.phase === "running" || timer.phase === "paused";

  return (
    <>
      <PageHeader
        title="Modo Foco"
        subtitle="Estude com tempo cronometrado. Ao concluir, vira missão do dia e rende XP."
      />

      <div className="mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          {/* -------------------- FORMULÁRIO -------------------- */}
          {showForm && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card-surface p-6 sm:p-8"
            >
              <div className="space-y-6">
                {/* nome */}
                <div>
                  <label className="mb-1.5 block text-sm text-muted">Nome da sessão</label>
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex.: Estudar Cálculo, Ler capítulo 3"
                    className="w-full rounded-xl border border-white/10 bg-ink px-4 py-2.5 text-sm text-soft placeholder:text-muted/60 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>

                {/* área (categoria) */}
                <div>
                  <label className="mb-1.5 block text-sm text-muted">Área</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => {
                      const { icon: Icon } = categoryMeta[c];
                      const active = category === c;
                      return (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setCategory(c)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all",
                            active
                              ? "border-brand/50 bg-brand/15 text-brand-light"
                              : "border-white/10 bg-white/5 text-muted hover:text-soft",
                          )}
                        >
                          <Icon size={15} />
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* duração */}
                <div>
                  <label className="mb-1.5 block text-sm text-muted">Duração</label>
                  <div className="flex flex-wrap gap-2">
                    {FOCUS_PRESETS.map((m) => {
                      const active = minutes === m;
                      return (
                        <button
                          type="button"
                          key={m}
                          onClick={() => setMinutes(m)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                            active
                              ? "border-brand/50 bg-brand/15 text-brand-light"
                              : "border-white/10 bg-white/5 text-muted hover:text-soft",
                          )}
                        >
                          {describeMinutes(m)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button className="w-full" size="lg" onClick={handleStart} disabled={!title.trim()}>
                  <Play size={18} /> Iniciar foco
                </Button>
              </div>
            </motion.div>
          )}

          {/* -------------------- TIMER -------------------- */}
          {showTimer && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="card-surface flex flex-col items-center gap-8 p-8"
            >
              {/* área da sessão */}
              <CategoryBadge category={category} />

              <FocusRing
                remaining={timer.remaining}
                progress={timer.progress}
                label={title}
                paused={timer.phase === "paused"}
              />

              {/* controles */}
              <div className="flex items-center gap-3">
                {timer.phase === "running" ? (
                  <Button variant="secondary" size="lg" onClick={timer.pause}>
                    <Pause size={18} /> Pausar
                  </Button>
                ) : (
                  <Button size="lg" onClick={timer.resume}>
                    <Play size={18} /> Retomar
                  </Button>
                )}
                <Button variant="ghost" size="lg" onClick={handleStop}>
                  <Square size={16} /> Parar
                </Button>
              </div>

              <p className="text-xs text-muted">
                Ao concluir, esta sessão vira missão de{" "}
                <span className="text-brand-light">{category}</span> e rende{" "}
                <span className="text-brand-light">+{FOCUS_XP_REWARD} XP</span>.
              </p>
            </motion.div>
          )}

          {/* -------------------- CONCLUÍDO -------------------- */}
          {done && timer.phase === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="card-surface relative overflow-hidden p-8 text-center"
            >
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-success/20 blur-3xl" />
              <div className="relative flex flex-col items-center gap-4">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 14, stiffness: 240, delay: 0.1 }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border border-success/30 bg-success/15 text-success"
                >
                  <CheckCircle2 size={32} />
                </motion.span>

                <div>
                  <h2 className="font-display text-xl font-bold text-soft">Sessão concluída!</h2>
                  <p className="mt-1 text-sm text-muted">
                    Você focou por {describeMinutes(done.minutes)}.
                  </p>
                </div>

                {/* resumo do que foi concluído */}
                <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/[0.06] bg-ink/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted">Missão</span>
                    <span className="truncate text-sm font-medium text-soft">{done.title}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted">Área</span>
                    <CategoryBadge category={done.category} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted">Recompensa</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        done.creditedXp > 0
                          ? "bg-brand/15 text-brand-light"
                          : "bg-white/5 text-muted",
                      )}
                    >
                      <Zap size={12} />
                      {done.creditedXp > 0 ? `+${done.creditedXp} XP` : "Limite diário atingido"}
                    </span>
                  </div>
                </div>

                <div className="mt-1 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
                  <Button className="flex-1" onClick={handleNewSession}>
                    <RotateCcw size={16} /> Nova sessão
                  </Button>
                  <Link href="/missions" className="flex-1">
                    <Button variant="secondary" className="w-full">
                      Ver missões <ArrowRight size={16} />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* dica de funcionamento */}
        {showTimer && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted/70">
            <Brain size={13} /> Mantenha esta aba aberta para o cronômetro tocar ao final.
          </p>
        )}
      </div>
    </>
  );
}
