"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, ChevronDown, Clock, Zap, CheckCheck, Brain } from "lucide-react";
import { CategoryBadge } from "./CategoryBadge";
import { describeMinutes } from "@/data/focus";
import type { FocusSession } from "@/hooks/useFocusHistory";

/** Formata um ISO como "12/06 · 14:30". */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FocusHistoryProps {
  sessions: FocusSession[];
  onClear: () => void;
}

/**
 * Aba expansiva "Histórico de sessões". Lista as sessões de foco concluídas
 * (nome, área, duração, data/hora). Começa fechada.
 */
export function FocusHistory({ sessions, onClear }: FocusHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="card-surface mt-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand-light">
            <History size={20} />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-soft">Histórico de sessões</h2>
            <p className="text-xs text-muted">
              {sessions.length === 0
                ? "Suas sessões concluídas aparecerão aqui."
                : `${sessions.length} sessão${sessions.length === 1 ? "" : "s"} concluída${sessions.length === 1 ? "" : "s"}.`}
            </p>
          </div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={20} className="text-muted" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 border-t border-white/[0.06] p-10 text-center">
                <Brain size={26} className="text-muted" />
                <p className="text-sm text-muted">Nenhuma sessão ainda.</p>
                <p className="max-w-sm text-xs text-muted/70">
                  Conclua uma sessão no Modo Foco para registrá-la aqui.
                </p>
              </div>
            ) : (
              <div className="border-t border-white/[0.06] p-5">
                {/* ação: limpar histórico */}
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={onClear}
                    className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-soft"
                  >
                    <CheckCheck size={13} /> Limpar histórico
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <CategoryBadge category={s.category} />
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-soft">
                            <Clock size={11} className="text-brand-light" /> {describeMinutes(s.minutes)}
                          </span>
                        </div>
                        {s.xp > 0 && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand-light">
                            <Zap size={11} /> +{s.xp} XP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-soft">{s.title}</p>
                        <span className="shrink-0 text-[11px] text-muted">
                          {formatWhen(s.completedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
