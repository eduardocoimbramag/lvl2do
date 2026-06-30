"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Clock,
  Sun,
  Repeat,
  CalendarDays,
  Pencil,
  RotateCw,
} from "lucide-react";
import { SchedulePopover } from "./SchedulePopover";
import { Button } from "./Button";
import {
  INTERVAL_PRESETS,
  MIN_INTERVAL_MINUTES,
  MAX_INTERVAL_MINUTES,
  alarmFireCount,
  describeAlarmRepeat,
  timeToMinutes,
  type Alarm,
  type AlarmRepeat,
  type AlarmIntradayRepeat,
} from "@/data/alarms";
import type { MissionSchedule } from "@/data/types";
import { cn } from "@/lib/utils";

/** Dados emitidos ao salvar (sem id/createdAt — gerados pelo hook). */
export type AlarmDraft = Omit<Alarm, "id" | "createdAt">;

interface NewAlarmModalProps {
  open: boolean;
  onClose: () => void;
  /** cria ou atualiza o alarme (em memória/localStorage). */
  onSave: (draft: AlarmDraft) => void;
  /** quando informado, o modal abre em modo de edição com estes valores. */
  initial?: Alarm | null;
}

/** Opções de agendamento (em quais dias), reaproveitando o padrão das missões. */
const REPEAT_OPTIONS = [
  { type: "once", label: "Uma vez", icon: Sun },
  { type: "weekly", label: "Semanalmente", icon: Repeat },
  { type: "dates", label: "Datas específicas", icon: CalendarDays },
] as const;

type RepeatType = (typeof REPEAT_OPTIONS)[number]["type"];

/** Converte um AlarmRepeat (once/weekly/dates) ↔ MissionSchedule (today/weekly/dates). */
function repeatToSchedule(repeat: AlarmRepeat): MissionSchedule {
  if (repeat.type === "weekly") return { type: "weekly", weekdays: repeat.weekdays };
  if (repeat.type === "dates") return { type: "dates", dates: repeat.dates };
  return { type: "today" };
}
function scheduleToRepeat(schedule: MissionSchedule): AlarmRepeat {
  if (schedule.type === "weekly") return { type: "weekly", weekdays: schedule.weekdays };
  if (schedule.type === "dates") return { type: "dates", dates: schedule.dates };
  return { type: "once" };
}

/**
 * Modal de criação/edição de alarme. Reaproveita o SchedulePopover (dias/datas)
 * e adiciona repetição intradiária (intervalo + horário limite) e seleção de som.
 */
export function NewAlarmModal({ open, onClose, onSave, initial }: NewAlarmModalProps) {
  const editing = !!initial;

  const [label, setLabel] = useState("");
  const [time, setTime] = useState("08:00");
  const [intraday, setIntraday] = useState<AlarmIntradayRepeat>({
    enabled: false,
    intervalMinutes: 60,
    untilTime: "18:00",
  });
  const [repeat, setRepeat] = useState<AlarmRepeat>({ type: "once" });
  const [popover, setPopover] = useState<"weekly" | "dates" | null>(null);

  // (re)inicializa o formulário ao abrir (novo ou edição)
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setLabel(initial.label);
      setTime(initial.time);
      setIntraday(initial.intraday);
      setRepeat(initial.repeat);
    } else {
      setLabel("");
      setTime("08:00");
      setIntraday({ enabled: false, intervalMinutes: 60, untilTime: "18:00" });
      setRepeat({ type: "once" });
    }
  }, [open, initial]);

  /** Clique numa pílula de agendamento (dias). */
  function handleRepeatOption(type: RepeatType) {
    if (type === "once") setRepeat({ type: "once" });
    else setPopover(type);
  }

  // validações
  const startMin = timeToMinutes(time);
  const untilMin = timeToMinutes(intraday.untilTime);
  const intervalInvalid =
    intraday.enabled &&
    (intraday.intervalMinutes < MIN_INTERVAL_MINUTES ||
      intraday.intervalMinutes > MAX_INTERVAL_MINUTES);
  const untilInvalid =
    intraday.enabled && (untilMin === null || startMin === null || untilMin < startMin);

  const draft: AlarmDraft | null = useMemo(() => {
    if (!label.trim() || startMin === null) return null;
    if (intervalInvalid || untilInvalid) return null;
    return {
      label: label.trim(),
      time,
      intraday,
      repeat,
      enabled: initial?.enabled ?? true,
    };
  }, [label, time, startMin, intraday, repeat, initial, intervalInvalid, untilInvalid]);

  // quantos toques por dia (prévia)
  const fireCount = draft ? alarmFireCount({ ...draft, id: "x", createdAt: "" }) : 0;

  function handleSubmit() {
    if (!draft) return;
    onSave(draft);
    onClose();
  }

  const repeatSummary = repeat.type !== "once" ? describeAlarmRepeat(repeat) : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Editar alarme" : "Novo alarme"}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="card-surface relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-soft">
                {editing ? "Editar alarme" : "Novo alarme"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-soft"
              >
                <X size={18} />
              </button>
            </div>

            <div className="-mr-2 space-y-5 overflow-y-auto pr-2">
              {/* nome */}
              <div>
                <label className="mb-1.5 block text-sm text-muted">Nome do alarme</label>
                <input
                  autoFocus
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex.: Beber água, Tomar remédio"
                  className="w-full rounded-xl border border-white/10 bg-ink px-4 py-2.5 text-sm text-soft placeholder:text-muted/60 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* horário do primeiro toque */}
              <div>
                <label className="mb-1.5 block text-sm text-muted">
                  {intraday.enabled ? "Primeiro toque" : "Horário"}
                </label>
                <div className="relative w-full max-w-[12rem]">
                  <Clock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-ink py-2.5 pl-10 pr-3 text-sm text-soft [color-scheme:dark] focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>

              {/* repetição intradiária */}
              <div className="rounded-2xl border border-white/[0.06] bg-ink/40 p-4">
                <button
                  type="button"
                  onClick={() =>
                    setIntraday((p) => ({ ...p, enabled: !p.enabled }))
                  }
                  aria-pressed={intraday.enabled}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                        intraday.enabled
                          ? "border-brand/30 bg-brand/15 text-brand-light"
                          : "border-white/10 bg-white/5 text-muted",
                      )}
                    >
                      <RotateCw size={16} />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-soft">
                        Repetir durante o dia
                      </span>
                      <span className="block text-xs text-muted">
                        Toca várias vezes (ex.: a cada 1h)
                      </span>
                    </span>
                  </span>
                  {/* switch */}
                  <span
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
                      intraday.enabled
                        ? "border-brand/40 bg-brand/30"
                        : "border-white/10 bg-white/10",
                    )}
                  >
                    <motion.span
                      layout
                      transition={{ type: "spring", damping: 24, stiffness: 320 }}
                      className={cn(
                        "absolute top-0.5 rounded-full",
                        intraday.enabled ? "right-0.5 bg-brand-light" : "left-0.5 bg-muted",
                      )}
                      style={{ height: "1.125rem", width: "1.125rem" }}
                    />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {intraday.enabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-3">
                        {/* intervalo */}
                        <div>
                          <p className="mb-1.5 text-xs text-muted">Intervalo entre os toques</p>
                          <div className="flex flex-wrap gap-2">
                            {INTERVAL_PRESETS.map((p) => {
                              const active = intraday.intervalMinutes === p.minutes;
                              return (
                                <button
                                  type="button"
                                  key={p.minutes}
                                  onClick={() =>
                                    setIntraday((prev) => ({ ...prev, intervalMinutes: p.minutes }))
                                  }
                                  className={cn(
                                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                                    active
                                      ? "border-brand/50 bg-brand/15 text-brand-light"
                                      : "border-white/10 bg-white/5 text-muted hover:text-soft",
                                  )}
                                >
                                  {p.label}
                                </button>
                              );
                            })}
                          </div>
                          {/* intervalo custom (minutos) */}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted">Ou</span>
                            <input
                              type="number"
                              min={MIN_INTERVAL_MINUTES}
                              max={MAX_INTERVAL_MINUTES}
                              value={intraday.intervalMinutes}
                              onChange={(e) =>
                                setIntraday((prev) => ({
                                  ...prev,
                                  intervalMinutes: Number(e.target.value) || 0,
                                }))
                              }
                              className={cn(
                                "w-20 rounded-lg border bg-ink px-2.5 py-1.5 text-xs text-soft focus:outline-none focus:ring-2 focus:ring-brand/30",
                                intervalInvalid
                                  ? "border-rose-400/50"
                                  : "border-white/10 focus:border-brand/50",
                              )}
                            />
                            <span className="text-xs text-muted">minutos</span>
                          </div>
                          {intervalInvalid && (
                            <p className="mt-1 text-[11px] text-rose-300">
                              Use entre {MIN_INTERVAL_MINUTES} e {MAX_INTERVAL_MINUTES} minutos.
                            </p>
                          )}
                        </div>

                        {/* horário limite */}
                        <div>
                          <p className="mb-1.5 text-xs text-muted">Tocar até</p>
                          <div className="relative w-full max-w-[12rem]">
                            <Clock
                              size={16}
                              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                            />
                            <input
                              type="time"
                              value={intraday.untilTime}
                              onChange={(e) =>
                                setIntraday((prev) => ({ ...prev, untilTime: e.target.value }))
                              }
                              className={cn(
                                "w-full rounded-xl border bg-ink py-2.5 pl-10 pr-3 text-sm text-soft [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-brand/30",
                                untilInvalid
                                  ? "border-rose-400/50"
                                  : "border-white/10 focus:border-brand/50",
                              )}
                            />
                          </div>
                          {untilInvalid && (
                            <p className="mt-1 text-[11px] text-rose-300">
                              O horário limite deve ser após o primeiro toque.
                            </p>
                          )}
                        </div>

                        {/* prévia da quantidade de toques */}
                        {!intervalInvalid && !untilInvalid && fireCount > 0 && (
                          <p className="rounded-lg border border-brand/20 bg-brand/5 px-3 py-2 text-xs text-brand-light">
                            {fireCount} {fireCount === 1 ? "toque" : "toques"} por dia
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* agendamento (dias) */}
              <div>
                <label className="mb-1.5 block text-sm text-muted">Repetição</label>
                <div className="flex flex-wrap gap-2">
                  {REPEAT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = repeat.type === opt.type;
                    return (
                      <button
                        type="button"
                        key={opt.type}
                        onClick={() => handleRepeatOption(opt.type)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                          active
                            ? "border-brand/50 bg-brand/15 text-brand-light"
                            : "border-white/10 bg-white/5 text-muted hover:text-soft",
                        )}
                      >
                        <Icon size={13} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {repeatSummary && (
                  <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-muted">
                        {repeat.type === "weekly" ? "Dias da semana" : "Datas específicas"}
                      </p>
                      <p className="truncate text-sm font-medium text-soft">{repeatSummary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPopover(repeat.type === "weekly" ? "weekly" : "dates")}
                      aria-label="Editar repetição"
                      className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-1.5 text-muted transition-colors hover:border-brand/40 hover:text-brand-light"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={!draft}>
                {editing ? "Salvar alterações" : "Criar alarme"}
              </Button>
            </div>
          </motion.div>

          {/* pop-up de agendamento (dias/datas), por cima do modal */}
          <SchedulePopover
            open={popover !== null}
            mode={popover ?? "weekly"}
            initial={repeatToSchedule(repeat)}
            onClose={() => setPopover(null)}
            onConfirm={(schedule) => {
              setRepeat(scheduleToRepeat(schedule));
              setPopover(null);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
