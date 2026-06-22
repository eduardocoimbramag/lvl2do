"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { MonthCalendar } from "./MonthCalendar";
import { Button } from "./Button";
import {
  WEEKDAYS,
  toISODate,
  type MissionSchedule,
  type Weekday,
} from "@/data/types";
import { cn } from "@/lib/utils";

type Mode = "weekly" | "dates";

interface SchedulePopoverProps {
  open: boolean;
  mode: Mode;
  /** valor inicial (ao reabrir para editar) */
  initial?: MissionSchedule;
  onClose: () => void;
  onConfirm: (schedule: MissionSchedule) => void;
}

/**
 * Pop-up de agendamento, exibido por cima do modal de nova missão.
 * - weekly: seleção de um ou mais dias da semana.
 * - dates: seleção de uma ou mais datas em um calendário.
 */
export function SchedulePopover({
  open,
  mode,
  initial,
  onClose,
  onConfirm,
}: SchedulePopoverProps) {
  const [weekdays, setWeekdays] = useState<Weekday[]>(
    initial?.type === "weekly" ? initial.weekdays : [],
  );
  const [dates, setDates] = useState<string[]>(
    initial?.type === "dates" ? initial.dates : [],
  );

  function toggleWeekday(day: Weekday) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function toggleDate(date: Date) {
    const iso = toISODate(date);
    setDates((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso],
    );
  }

  function handleConfirm() {
    if (mode === "weekly") {
      onConfirm({ type: "weekly", weekdays: [...weekdays].sort((a, b) => a - b) });
    } else {
      onConfirm({ type: "dates", dates: [...dates].sort() });
    }
  }

  const canConfirm = mode === "weekly" ? weekdays.length > 0 : dates.length > 0;
  const title = mode === "weekly" ? "Selecionar dias da semana" : "Selecionar datas";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          // z acima do modal (z-50) de nova missão
          className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* backdrop próprio */}
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="card-surface relative w-full max-w-md rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-soft">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-soft"
              >
                <X size={18} />
              </button>
            </div>

            {mode === "weekly" ? (
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((w) => {
                  const active = weekdays.includes(w.value);
                  return (
                    <button
                      type="button"
                      key={w.value}
                      onClick={() => toggleWeekday(w.value)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                        active
                          ? "border-brand/50 bg-brand/15 text-brand-light"
                          : "border-white/10 bg-white/5 text-muted hover:text-soft",
                      )}
                    >
                      {active && <Check size={14} />}
                      {w.long}
                    </button>
                  );
                })}
              </div>
            ) : (
              <MonthCalendar
                selectedDates={dates}
                onSelect={toggleDate}
                layoutId="schedule-dates"
              />
            )}

            {/* contagem do que foi selecionado */}
            <p className="mt-4 text-xs text-muted">
              {mode === "weekly"
                ? `${weekdays.length} dia${weekdays.length === 1 ? "" : "s"} selecionado${weekdays.length === 1 ? "" : "s"}`
                : `${dates.length} data${dates.length === 1 ? "" : "s"} selecionada${dates.length === 1 ? "" : "s"}`}
            </p>

            <div className="mt-5 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={!canConfirm}>
                Confirmar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
