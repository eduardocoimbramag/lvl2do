"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, ChevronDown, CalendarOff } from "lucide-react";
import { MonthCalendar } from "./MonthCalendar";

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Formata uma data como "12 de junho de 2026". */
function formatLongDate(date: Date) {
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

/**
 * Seção expansiva "Missões futuras".
 * Inicia fechada e revela um calendário mensal ao ser clicada.
 * A listagem de missões por dia será integrada futuramente,
 * quando as missões passarem a ter uma data agendada.
 */
export function FutureMissions() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | null>(null);

  return (
    <section className="card-surface mt-8 overflow-hidden">
      {/* cabeçalho clicável (toggle) */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand-light">
            <CalendarClock size={20} />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-soft">Missões futuras</h2>
            <p className="text-xs text-muted">
              Veja e agende missões para outros dias no calendário.
            </p>
          </div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={20} className="text-muted" />
        </motion.span>
      </button>

      {/* conteúdo expansível */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="grid gap-5 border-t border-white/[0.06] p-5 md:grid-cols-2">
              {/* calendário */}
              <MonthCalendar selected={selected} onSelect={setSelected} />

              {/* painel do dia selecionado */}
              <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-ink/40 p-5">
                {selected ? (
                  <>
                    <p className="text-xs uppercase tracking-wide text-muted">Dia selecionado</p>
                    <p className="mt-1 font-display text-base font-semibold text-soft">
                      {formatLongDate(selected)}
                    </p>
                    <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
                      <CalendarOff size={24} className="text-muted" />
                      <p className="text-sm text-muted">Nenhuma missão agendada para este dia.</p>
                      <p className="max-w-[16rem] text-xs text-muted/70">
                        Em breve você poderá agendar missões escolhendo a data ao criá-las.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                    <CalendarClock size={26} className="text-muted" />
                    <p className="text-sm text-muted">Selecione um dia no calendário</p>
                    <p className="max-w-[16rem] text-xs text-muted/70">
                      As missões agendadas para o dia aparecerão aqui.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
