"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  ChevronDown,
  CalendarOff,
  Zap,
  Check,
  RotateCcw,
  Lock,
} from "lucide-react";
import { MonthCalendar } from "./MonthCalendar";
import { CategoryBadge, ShiftBadge } from "./CategoryBadge";
import { ProgressBar } from "./ProgressBar";
import { occursOn } from "@/hooks/useMissions";
import { useAppMissions, useAppStats } from "@/hooks/AppStateProvider";
import { toISODate, type Mission } from "@/data/types";
import { cn } from "@/lib/utils";

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Formata uma data como "12 de junho de 2026". */
function formatLongDate(date: Date) {
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

/** Chave "YYYY-MM-DD" de ontem. */
function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

interface FutureMissionsProps {
  /** todas as missões (incl. recorrentes/futuras) para calcular o agendamento */
  missions: Mission[];
}

/**
 * Seção expansiva "Calendário de missões".
 * Mostra um calendário mensal; ao selecionar um dia, lista as missões daquele
 * dia. Para HOJE e ONTEM, permite concluir/desfazer ali mesmo — útil para
 * marcar missões esquecidas de ontem (creditam no orçamento de ontem). Mostra
 * a barra de XP do dia (X/300) para hoje e ontem.
 */
export function FutureMissions({ missions }: FutureMissionsProps) {
  const { toggleForDay, isDoneForDay } = useAppMissions();
  const { dailyForDate } = useAppStats();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | null>(null);

  const todayKey = toISODate(new Date());
  const yKey = yesterdayKey();

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

  const selectedKey = selected ? toISODate(selected) : null;
  const isToday = selectedKey === todayKey;
  const isYesterday = selectedKey === yKey;
  const isFuture = selectedKey ? selectedKey > todayKey : false;
  // só dá para concluir em hoje ou ontem
  const canComplete = isToday || isYesterday;

  // barra de XP do dia selecionado (hoje/ontem); null nos demais dias
  const dayBudget = selectedKey ? dailyForDate(selectedKey) : null;

  /** Uma missão está concluída neste dia? (recorrente → por-dia; "uma vez" → status) */
  function doneForSelected(m: Mission): boolean {
    if (!selectedKey) return false;
    return isDoneForDay(m, selectedKey);
  }

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
            <h2 className="font-display text-base font-semibold text-soft">Calendário de missões</h2>
            <p className="text-xs text-muted">
              Veja as missões agendadas e conclua as de ontem que você esqueceu.
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
              {/* calendário + legenda */}
              <div>
                <MonthCalendar selected={selected} onSelect={setSelected} isMarked={isMarked} />
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Hoje
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Ontem
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Agendado
                  </span>
                </div>
              </div>

              {/* painel do dia selecionado */}
              <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-ink/40 p-5">
                {selected ? (
                  <>
                    <p className="text-xs uppercase tracking-wide text-muted">
                      {isToday ? "Hoje" : isYesterday ? "Ontem" : isFuture ? "Dia agendado" : "Dia selecionado"}
                    </p>
                    <p className="mt-1 font-display text-base font-semibold text-soft">
                      {formatLongDate(selected)}
                    </p>

                    {/* barra de XP do dia (hoje/ontem) */}
                    {dayBudget && (
                      <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1.5 text-muted">
                            <Zap size={12} className="text-brand-light" /> XP do dia
                          </span>
                          <span className="font-medium text-soft">
                            {dayBudget.used} / {dayBudget.limit}
                          </span>
                        </div>
                        <ProgressBar
                          value={dayBudget.used}
                          max={dayBudget.limit}
                          size="sm"
                          tone={dayBudget.used >= dayBudget.limit ? "success" : "brand"}
                        />
                      </div>
                    )}

                    {dayMissions.length > 0 ? (
                      <div className="mt-4 flex flex-col gap-2.5">
                        {dayMissions.map((m) => {
                          const done = doneForSelected(m);
                          return (
                            <div
                              key={m.id}
                              className={cn(
                                "rounded-xl border p-3 transition-colors",
                                done
                                  ? "border-success/30 bg-success/5"
                                  : "border-white/[0.06] bg-white/[0.02]",
                              )}
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
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  done ? "text-muted line-through" : "text-soft",
                                )}
                              >
                                {m.title}
                              </p>
                              {m.description && (
                                <p className="mt-0.5 text-xs text-muted">{m.description}</p>
                              )}

                              {/* ação de concluir/desfazer (só hoje/ontem) */}
                              {canComplete ? (
                                <button
                                  type="button"
                                  onClick={() => selectedKey && toggleForDay(m.id, selectedKey)}
                                  className={cn(
                                    "mt-2.5 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                                    done
                                      ? "border-white/10 bg-white/5 text-muted hover:text-soft"
                                      : "border-success/40 bg-success/15 text-success hover:bg-success/25",
                                  )}
                                >
                                  {done ? (
                                    <>
                                      <RotateCcw size={13} /> Desfazer
                                    </>
                                  ) : (
                                    <>
                                      <Check size={13} /> Marcar como concluída
                                    </>
                                  )}
                                </button>
                              ) : (
                                <p className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-muted/70">
                                  <Lock size={11} />
                                  {isFuture
                                    ? "Disponível quando o dia chegar"
                                    : "Só é possível concluir hoje ou ontem"}
                                </p>
                              )}
                            </div>
                          );
                        })}
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
                      Conclua as missões de ontem que você esqueceu (até virar o dia).
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
