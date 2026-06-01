"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  /** dia selecionado atualmente (controlado) */
  selected: Date | null;
  /** chamado ao clicar em um dia */
  onSelect: (date: Date) => void;
}

/**
 * Calendário mensal leve (sem dependências) no estilo visual do app.
 * Navega entre meses e destaca o dia de hoje. As missões agendadas
 * por dia serão integradas futuramente (escolha de data na missão).
 */
export function MonthCalendar({ selected, onSelect }: MonthCalendarProps) {
  const today = useMemo(() => new Date(), []);
  // mês exibido: inicia no mês do dia selecionado ou no mês atual
  const [viewDate, setViewDate] = useState(() => {
    const base = selected ?? today;
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

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-ink/40 p-4">
      {/* cabeçalho: navegação de mês */}
      <div className="mb-3 flex items-center justify-between">
        <button
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
          const isSelected = selected ? isSameDay(date, selected) : false;
          return (
            <button
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
              {isSelected && (
                <motion.span
                  layoutId="calendar-selected"
                  className="absolute inset-0 -z-10 rounded-lg border border-brand/40 bg-brand/15"
                  transition={{ type: "spring", damping: 26, stiffness: 320 }}
                />
              )}
              {date.getDate()}
              {isToday && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-light" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
