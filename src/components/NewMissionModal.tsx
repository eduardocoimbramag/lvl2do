"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Zap, Sun, CalendarDays, Repeat, Pencil } from "lucide-react";
import {
  CATEGORIES,
  DIFFICULTIES,
  SHIFTS,
  XP_BY_DIFFICULTY,
  describeSchedule,
  type Category,
  type Difficulty,
  type Shift,
  type Mission,
  type MissionSchedule,
} from "@/data/types";
import { shiftMeta } from "./CategoryBadge";
import { SchedulePopover } from "./SchedulePopover";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

/** Campos editáveis de uma missão (modo edição). */
export type MissionEditValues = Pick<
  Mission,
  "title" | "description" | "category" | "difficulty" | "shift" | "xp" | "schedule"
>;

interface NewMissionModalProps {
  open: boolean;
  onClose: () => void;
  /** cria a missão (modo criação). Ignorado quando initialMission é informada. */
  onCreate?: (mission: Mission) => void;
  /** categoria (card de destino) pré-selecionada ao abrir o modal */
  initialCategory?: Category;
  /** quando informada, o modal abre em modo EDIÇÃO com estes valores. */
  initialMission?: Mission | null;
  /** salva as alterações (modo edição). */
  onSave?: (id: string, values: MissionEditValues) => void;
}

/** Opções de agendamento exibidas como pílulas. */
const SCHEDULE_OPTIONS = [
  { type: "today", label: "Hoje", icon: Sun },
  { type: "weekly", label: "Semanalmente", icon: Repeat },
  { type: "dates", label: "Datas específicas", icon: CalendarDays },
] as const;

type ScheduleType = (typeof SCHEDULE_OPTIONS)[number]["type"];

/**
 * Modal visual de criação de missão.
 * IMPORTANTE: não salva dados no banco — apenas adiciona à lista local.
 */
export function NewMissionModal({
  open,
  onClose,
  onCreate,
  initialCategory,
  initialMission,
  onSave,
}: NewMissionModalProps) {
  const editing = !!initialMission;
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState<Category>(initialCategory ?? "Profissional");
  const [difficulty, setDifficulty] = useState<Difficulty>("Fácil");
  const [shift, setShift] = useState<Shift>("Manhã");
  const [schedule, setSchedule] = useState<MissionSchedule>({ type: "today" });
  // pop-up de agendamento ("weekly" | "dates") ou fechado (null)
  const [popover, setPopover] = useState<"weekly" | "dates" | null>(null);

  // (re)inicializa o formulário ao abrir: edição preenche; criação zera.
  useEffect(() => {
    if (!open) return;
    if (initialMission) {
      setTitle(initialMission.title);
      setSubtitle(initialMission.description ?? "");
      setCategory(initialMission.category);
      setDifficulty(initialMission.difficulty);
      setShift(initialMission.shift);
      setSchedule(initialMission.schedule);
    } else {
      setTitle("");
      setSubtitle("");
      setCategory(initialCategory ?? "Profissional");
      setDifficulty("Fácil");
      setShift("Manhã");
      setSchedule({ type: "today" });
    }
  }, [open, initialMission, initialCategory]);

  const xp = XP_BY_DIFFICULTY[difficulty];

  function resetForm() {
    setTitle("");
    setSubtitle("");
    setCategory(initialCategory ?? "Profissional");
    setDifficulty("Fácil");
    setShift("Manhã");
    setSchedule({ type: "today" });
  }

  /** Clique numa das pílulas de agendamento. */
  function handleScheduleOption(type: ScheduleType) {
    if (type === "today") {
      setSchedule({ type: "today" });
    } else {
      // abre o pop-up para escolher dias/datas
      setPopover(type);
    }
  }

  function handleSubmit() {
    if (!title.trim()) return;
    if (editing && initialMission) {
      // modo edição: salva todos os campos editáveis
      onSave?.(initialMission.id, {
        title: title.trim(),
        description: subtitle.trim() || undefined,
        category,
        difficulty,
        shift,
        xp,
        schedule,
      });
    } else {
      onCreate?.({
        id: `local-${title}-${xp}-${category}-${shift}`,
        title: title.trim(),
        description: subtitle.trim() || undefined,
        category,
        difficulty,
        shift,
        status: "pending",
        xp,
        schedule,
      });
      resetForm();
    }
    onClose();
  }

  // Resumo do agendamento recorrente (weekly/dates) com botão de editar.
  const scheduleSummary =
    schedule.type !== "today" ? describeSchedule(schedule) : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* backdrop */}
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Editar missão" : "Nova missão"}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="card-surface relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-soft">
                {editing ? "Editar missão" : "Nova missão"}
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
              {/* título */}
              <div>
                <label className="mb-1.5 block text-sm text-muted">Título da missão</label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Estudar 1 capítulo de React"
                  className="w-full rounded-xl border border-white/10 bg-ink px-4 py-2.5 text-sm text-soft placeholder:text-muted/60 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* subtítulo (opcional) */}
              <div>
                <label className="mb-1.5 block text-sm text-muted">
                  Subtítulo <span className="text-muted/60">(opcional)</span>
                </label>
                <input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ex.: Avançar no roadmap de frontend"
                  className="w-full rounded-xl border border-white/10 bg-ink px-4 py-2.5 text-sm text-soft placeholder:text-muted/60 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* categoria — define o card de destino da missão */}
              <div>
                <label className="mb-1.5 block text-sm text-muted">Categoria (card de destino)</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCategory(c)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                        category === c
                          ? "border-brand/50 bg-brand/15 text-brand-light"
                          : "border-white/10 bg-white/5 text-muted hover:text-soft",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* turno */}
              <div>
                <label className="mb-1.5 block text-sm text-muted">Turno</label>
                <div className="flex flex-wrap gap-2">
                  {SHIFTS.map((s) => {
                    const { icon: Icon } = shiftMeta[s];
                    const active = shift === s;
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setShift(s)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                          active
                            ? "border-brand/50 bg-brand/15 text-brand-light"
                            : "border-white/10 bg-white/5 text-muted hover:text-soft",
                        )}
                      >
                        <Icon size={13} />
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* dificuldade — com indicador de XP por nível */}
              <div>
                <label className="mb-1.5 block text-sm text-muted">Dificuldade</label>
                <div className="flex flex-wrap gap-2">
                  {DIFFICULTIES.map((d) => {
                    const active = difficulty === d;
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                          active
                            ? "border-brand/50 bg-brand/15 text-brand-light"
                            : "border-white/10 bg-white/5 text-muted hover:text-soft",
                        )}
                      >
                        {d}
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                            active
                              ? "bg-brand/20 text-brand-light"
                              : "bg-white/5 text-muted",
                          )}
                        >
                          <Zap size={10} /> {XP_BY_DIFFICULTY[d]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* agendamento */}
              <div>
                <label className="mb-1.5 block text-sm text-muted">Agendamento</label>
                <div className="flex flex-wrap gap-2">
                  {SCHEDULE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = schedule.type === opt.type;
                    return (
                      <button
                        type="button"
                        key={opt.type}
                        onClick={() => handleScheduleOption(opt.type)}
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

                {/* resumo do agendamento recorrente + editar (lápis) */}
                {scheduleSummary && (
                  <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-muted">
                        {schedule.type === "weekly" ? "Dias da semana" : "Datas específicas"}
                      </p>
                      <p className="truncate text-sm font-medium text-soft">{scheduleSummary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPopover(schedule.type === "weekly" ? "weekly" : "dates")}
                      aria-label="Editar agendamento"
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
              <Button className="flex-1" onClick={handleSubmit} disabled={!title.trim()}>
                {editing ? "Salvar alterações" : "Criar missão"}
              </Button>
            </div>
          </motion.div>

          {/* pop-up de agendamento (por cima do modal) */}
          <SchedulePopover
            open={popover !== null}
            mode={popover ?? "weekly"}
            initial={schedule}
            onClose={() => setPopover(null)}
            onConfirm={(s) => {
              setSchedule(s);
              setPopover(null);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
