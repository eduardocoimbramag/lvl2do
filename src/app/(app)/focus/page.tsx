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
import { FocusHistory } from "@/components/FocusHistory";
import { CategoryBadge, categoryMeta } from "@/components/CategoryBadge";
import { useAppMissions } from "@/hooks/AppStateProvider";
import { useFocusTimer } from "@/hooks/useFocusTimer";
import { useFocusHistory } from "@/hooks/useFocusHistory";
import { useAlarmSound } from "@/hooks/useAlarmSound";
import { FOCUS_OPTIONS, focusOptionByMinutes, describeMinutes } from "@/data/focus";
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
  const { sessions, addSession, clearAll } = useFocusHistory();

  // formulário
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Profissional");
  const [minutes, setMinutes] = useState(FOCUS_OPTIONS[0].minutes);

  // info da sessão concluída (tela de done)
  const [done, setDone] = useState<DoneInfo | null>(null);

  // guarda os dados da sessão em andamento (para registrar ao concluir)
  const activeSession = useRef<{
    title: string;
    category: Category;
    minutes: number;
    xp: number;
  } | null>(null);

  const timer = useFocusTimer({
    onComplete: () => {
      const session = activeSession.current;
      if (!session) return;
      // toca o sino de conclusão
      fire();
      // credita XP (variável pela duração), conta streak e vira missão do dia
      const creditedXp = addCompletedMission({
        title: session.title,
        category: session.category,
        xp: session.xp,
      });
      // registra no histórico local de sessões
      addSession({
        title: session.title,
        category: session.category,
        minutes: session.minutes,
        xp: creditedXp,
      });
      setDone({ title: session.title, category: session.category, minutes: session.minutes, creditedXp });
      activeSession.current = null;
    },
  });

  const selectedXp = focusOptionByMinutes(minutes).xp;

  function handleStart() {
    if (!title.trim()) return;
    activeSession.current = { title: title.trim(), category, minutes, xp: selectedXp };
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

  const isIdle = timer.phase === "idle" && !done;
  const isRunning = timer.phase === "running" || timer.phase === "paused";
  const isDone = !!done && timer.phase === "done";

  // no ocioso, o relógio mostra o tempo escolhido; senão, o restante real
  const clockRemaining = isIdle ? minutes * 60 : timer.remaining;

  return (
    <>
      <PageHeader
        title="Modo Foco"
        subtitle="Estude com tempo cronometrado. Ao concluir, vira missão do dia e rende XP."
      />

      <div className="mx-auto max-w-3xl">
        {/* card principal: relógio (esquerda) sempre visível + menu (direita) */}
        <div className="card-surface grid gap-8 p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center">
          {/* -------- RELÓGIO (esquerda) -------- */}
          <div className="flex justify-center">
            <FocusRing
              remaining={clockRemaining}
              progress={isIdle ? 0 : timer.progress}
              paused={timer.phase === "paused"}
              idle={isIdle}
              size={240}
              label={isRunning ? title : isDone ? "Concluída!" : "Pronto para focar"}
            />
          </div>

          {/* -------- MENU (direita) -------- */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              {/* FORMULÁRIO (ocioso) */}
              {isIdle && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="mb-1.5 block text-sm text-muted">Nome da sessão</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex.: Estudar Cálculo"
                      className="w-full rounded-xl border border-white/10 bg-ink px-4 py-2.5 text-sm text-soft placeholder:text-muted/60 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>

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
                              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                              active
                                ? "border-brand/50 bg-brand/15 text-brand-light"
                                : "border-white/10 bg-white/5 text-muted hover:text-soft",
                            )}
                          >
                            <Icon size={14} />
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm text-muted">Duração</label>
                    <div className="flex flex-wrap gap-2">
                      {FOCUS_OPTIONS.map((opt) => {
                        const active = minutes === opt.minutes;
                        return (
                          <button
                            type="button"
                            key={opt.minutes}
                            onClick={() => setMinutes(opt.minutes)}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                              active
                                ? "border-brand/50 bg-brand/15 text-brand-light"
                                : "border-white/10 bg-white/5 text-muted hover:text-soft",
                            )}
                          >
                            {opt.label}
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                                active ? "bg-brand/20 text-brand-light" : "bg-white/5 text-muted",
                              )}
                            >
                              <Zap size={10} /> {opt.xp}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Button className="w-full" size="lg" onClick={handleStart} disabled={!title.trim()}>
                    <Play size={18} /> Iniciar foco
                  </Button>
                </motion.div>
              )}

              {/* CONTROLES (rodando/pausado) */}
              {isRunning && (
                <motion.div
                  key="controls"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-5"
                >
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={category} />
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand-light">
                      <Zap size={12} /> +{selectedXp} XP
                    </span>
                  </div>

                  <p className="truncate font-display text-lg font-semibold text-soft">{title}</p>

                  <div className="flex flex-col gap-2.5">
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

                  <p className="flex items-center gap-1.5 text-xs text-muted/70">
                    <Brain size={13} /> Mantenha esta aba aberta até o fim.
                  </p>
                </motion.div>
              )}

              {/* CONCLUÍDO */}
              {isDone && done && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-success/30 bg-success/15 text-success">
                      <CheckCircle2 size={22} />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-bold text-soft">Sessão concluída!</h2>
                      <p className="text-xs text-muted">
                        Você focou por {describeMinutes(done.minutes)}.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 rounded-2xl border border-white/[0.06] bg-ink/40 p-4">
                    <Row label="Sessão" value={<span className="truncate text-sm font-medium text-soft">{done.title}</span>} />
                    <Row label="Área" value={<CategoryBadge category={done.category} />} />
                    <Row
                      label="Recompensa"
                      value={
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                            done.creditedXp > 0 ? "bg-brand/15 text-brand-light" : "bg-white/5 text-muted",
                          )}
                        >
                          <Zap size={12} />
                          {done.creditedXp > 0 ? `+${done.creditedXp} XP` : "Limite diário atingido"}
                        </span>
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button className="flex-1" onClick={handleNewSession}>
                      <RotateCcw size={16} /> Nova sessão
                    </Button>
                    <Link href="/missions" className="flex-1">
                      <Button variant="secondary" className="w-full">
                        Ver missões <ArrowRight size={16} />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* histórico de sessões (aba expansiva) */}
        <FocusHistory sessions={sessions} onClear={clearAll} />
      </div>
    </>
  );
}

/** Linha rótulo/valor do resumo. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted">{label}</span>
      {value}
    </div>
  );
}
