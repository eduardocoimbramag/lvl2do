"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toISODate } from "@/data/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Compara duas datas apenas por ano/mês/dia (ignora horário). */
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface MonthCalendarProps {
  /** dia selecionado (modo único). Em modo múltiplo, use selectedDates. */
  selected?: Date | null;
  /** ISO dates selecionadas (modo múltiplo). */
  selectedDates?: string[];
  /** chamado ao clicar em um dia */
  onSelect: (date: Date) => void;
  /** datas (ISO) que recebem um marcador (ex.: têm missões agendadas) */
  markedDates?: Set<string>;
  /** predicado para marcar dias (útil p/ recorrência sem limite de mês) */
  isMarked?: (date: Date) => boolean;
  /** layoutId único da animação de seleção (evita conflito com outro calendário) */
  layoutId?: string;
}

/**
 * Calendário mensal leve (sem dependências) no estilo visual do app.
 * Suporta seleção única (`selected`) ou múltipla (`selectedDates`) e
 * marcadores em dias específicos (`markedDates`).
 */
export function MonthCalendar({
  selected,
  selectedDates,
  onSelect,
  markedDates,
  isMarked,
  layoutId = "calendar-selected",
}: MonthCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const multiple = Array.isArray(selectedDates);

  // mês exibido: inicia no mês do 1º dia selecionado ou no mês atual
  const [viewDate, setViewDate] = useState(() => {
    const base =
      selected ??
      (selectedDates && selectedDates.length > 0
        ? new Date(`${selectedDates[0]}T00:00:00`)
        : today);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // monta a grade (inclui células vazias antes do dia 1 para alinhar à semana)
  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(new Date(year, month, d));
    return list;
  }, [year, month]);

  function goToMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
  }

  function isSelectedDay(date: Date) {
    if (multiple) return selectedDates!.includes(toISODate(date));
    return selected ? isSameDay(date, selected) : false;
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-ink/40 p-4">
      {/* cabeçalho: navegação de mês */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          aria-label="Mês anterior"
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-muted transition-colors hover:border-brand/40 hover:text-soft"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-display text-sm font-semibold text-soft">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          aria-label="Próximo mês"
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-muted transition-colors hover:border-brand/40 hover:text-soft"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* dias da semana */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-center text-[11px] font-medium text-muted">
            {w}
          </span>
        ))}
      </div>

      {/* grade de dias */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />;
          const isToday = isSameDay(date, today);
          const isSelected = isSelectedDay(date);
          const marked = isMarked
            ? isMarked(date)
            : markedDates?.has(toISODate(date)) ?? false;
          return (
            <button
              type="button"
              key={date.toISOString()}
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              aria-label={`${date.getDate()} de ${MONTHS[month]}`}
              className={cn(
                "relative flex h-9 items-center justify-center rounded-lg text-sm transition-colors",
                isSelected
                  ? "font-semibold text-soft"
                  : "text-muted hover:bg-white/5 hover:text-soft",
                isToday && !isSelected && "text-brand-light",
              )}
            >
              {isSelected &&
                (multiple ? (
                  <span className="absolute inset-0 -z-10 rounded-lg border border-brand/40 bg-brand/15" />
                ) : (
                  <motion.span
                    layoutId={layoutId}
                    className="absolute inset-0 -z-10 rounded-lg border border-brand/40 bg-brand/15"
                    transition={{ type: "spring", damping: 26, stiffness: 320 }}
                  />
                ))}
              {date.getDate()}
              {/* marcador de missões / indicador de hoje */}
              {(marked || (isToday && !isSelected)) && (
                <span
                  className={cn(
                    "absolute bottom-1 h-1 w-1 rounded-full",
                    marked ? "bg-brand" : "bg-brand-light",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
