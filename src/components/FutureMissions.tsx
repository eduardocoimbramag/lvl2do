"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, ChevronDown, CalendarOff, Zap } from "lucide-react";
import { MonthCalendar } from "./MonthCalendar";
import { CategoryBadge, ShiftBadge } from "./CategoryBadge";
import { occursOn } from "@/hooks/useMissions";
import { toISODate, type Mission } from "@/data/types";

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Formata uma data como "12 de junho de 2026". */
function formatLongDate(date: Date) {
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

interface FutureMissionsProps {
  /** todas as missões (incl. recorrentes/futuras) para calcular o agendamento */
  missions: Mission[];
}

/**
 * Seção expansiva "Missões futuras".
 * Inicia fechada e revela um calendário mensal ao ser clicada.
 * Os dias com missões agendadas (regra weekly/dates, ou "hoje" no dia atual)
 * recebem um marcador; ao selecionar um dia, lista as missões daquele dia.
 */
export function FutureMissions({ missions }: FutureMissionsProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | null>(null);

  // marca no calendário qualquer dia que tenha ao menos uma missão agendada
  const isMarked = useMemo(
    () => (date: Date) => missions.some((m) => occursOn(m, date)),
    [missions],
  );

  // missões do dia selecionado
  const dayMissions = useMemo(
    () => (selected ? missions.filter((m) => occursOn(m, selected)) : []),
    [missions, selected],
  );

  const isFuture = selected ? toISODate(selected) > toISODate(new Date()) : false;

  return (
    <section className="card-surface mt-8 overflow-hidden">
      {/* cabeçalho clicável (toggle) */}
      <button
        type="button"
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
              Veja as missões agendadas para outros dias no calendário.
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
              <MonthCalendar selected={selected} onSelect={setSelected} isMarked={isMarked} />

              {/* painel do dia selecionado */}
              <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-ink/40 p-5">
                {selected ? (
                  <>
                    <p className="text-xs uppercase tracking-wide text-muted">
                      {isFuture ? "Dia agendado" : "Dia selecionado"}
                    </p>
                    <p className="mt-1 font-display text-base font-semibold text-soft">
                      {formatLongDate(selected)}
                    </p>

                    {dayMissions.length > 0 ? (
                      <div className="mt-4 flex flex-col gap-2.5">
                        {dayMissions.map((m) => (
                          <div
                            key={m.id}
                            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <CategoryBadge category={m.category} />
                                <ShiftBadge shift={m.shift} />
                              </div>
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand-light">
                                <Zap size={11} /> {m.xp} XP
                              </span>
                            </div>
                            <p className="text-sm font-medium text-soft">{m.title}</p>
                            {m.description && (
                              <p className="mt-0.5 text-xs text-muted">{m.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
                        <CalendarOff size={24} className="text-muted" />
                        <p className="text-sm text-muted">Nenhuma missão agendada para este dia.</p>
                        <p className="max-w-[16rem] text-xs text-muted/70">
                          Agende missões em &quot;Nova missão&quot; usando Semanalmente ou Datas específicas.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                    <CalendarClock size={26} className="text-muted" />
                    <p className="text-sm text-muted">Selecione um dia no calendário</p>
                    <p className="max-w-[16rem] text-xs text-muted/70">
                      Os dias com missões agendadas aparecem marcados.
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
