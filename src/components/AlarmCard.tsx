"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, X, RotateCw, CalendarClock } from "lucide-react";
import {
  alarmFireCount,
  describeAlarmIntraday,
  describeAlarmRepeat,
  type Alarm,
} from "@/data/alarms";
import { cn } from "@/lib/utils";

interface AlarmCardProps {
  alarm: Alarm;
  onToggle: (id: string) => void;
  onEdit: (alarm: Alarm) => void;
  onRemove: (id: string) => void;
}

/**
 * Card de um alarme: horário em destaque, nome, etiquetas de recorrência /
 * repetição intradiária, switch de ativar e ações (editar, remover).
 * Visual premium consistente com os cards do projeto.
 */
export function AlarmCard({ alarm, onToggle, onEdit, onRemove }: AlarmCardProps) {
  const [confirming, setConfirming] = useState(false);
  const enabled = alarm.enabled;
  const fireCount = alarmFireCount(alarm);
  const intradayText = describeAlarmIntraday(alarm.intraday);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", damping: 26, stiffness: 280 }}
      className={cn(
        "card-surface relative flex flex-col gap-4 p-5 transition-opacity",
        !enabled && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* horário + nome */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-display text-4xl font-bold tracking-tight tabular-nums",
                enabled ? "text-soft" : "text-muted",
              )}
            >
              {alarm.time}
            </span>
            {fireCount > 1 && (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand-light">
                {fireCount}×/dia
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm font-medium text-soft">{alarm.label}</p>
        </div>

        {/* switch ativar/desativar */}
        <button
          type="button"
          onClick={() => onToggle(alarm.id)}
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? "Desativar alarme" : "Ativar alarme"}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
            enabled ? "border-brand/40 bg-brand/30" : "border-white/10 bg-white/10",
          )}
        >
          <motion.span
            layout
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            className={cn(
              "absolute top-0.5 rounded-full",
              enabled ? "right-0.5 bg-brand-light" : "left-0.5 bg-muted",
            )}
            style={{ height: "1.375rem", width: "1.375rem" }}
          />
        </button>
      </div>

      {/* etiquetas */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-soft">
          <CalendarClock size={13} className="text-brand-light" />
          {describeAlarmRepeat(alarm.repeat)}
        </span>
        {intradayText && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-soft">
            <RotateCw size={13} className="text-brand-light" />
            {intradayText}
          </span>
        )}
      </div>

      {/* ações */}
      <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] pt-3">
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Remover alarme?</span>
            <button
              type="button"
              onClick={() => onRemove(alarm.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-400/15 px-2.5 py-1 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-400/25"
            >
              <Trash2 size={13} /> Sim
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-muted transition-colors hover:text-soft"
            >
              Não
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onEdit(alarm)}
              aria-label="Editar alarme"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-brand/40 hover:text-brand-light"
            >
              <Pencil size={14} /> Editar
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Remover alarme"
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-1.5 text-muted transition-colors hover:border-rose-400/40 hover:text-rose-300"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
