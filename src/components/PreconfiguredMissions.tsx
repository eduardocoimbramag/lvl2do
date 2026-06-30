"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCog,
  ChevronDown,
  Repeat,
  CalendarDays,
  Pencil,
  X,
  Trash2,
  Zap,
} from "lucide-react";
import { CategoryBadge, ShiftBadge } from "./CategoryBadge";
import { NewMissionModal, type MissionEditValues } from "./NewMissionModal";
import {
  describeSchedule,
  type Mission,
} from "@/data/types";
import { cn } from "@/lib/utils";

interface PreconfiguredMissionsProps {
  /** todas as missões (filtramos as recorrentes aqui) */
  missions: Mission[];
  /** atualiza todos os campos editáveis de uma missão */
  onUpdateMission: (id: string, values: MissionEditValues) => void;
  /** remove a missão por completo */
  onRemove: (id: string) => void;
}

/**
 * Seção expansiva "Missões pré-configuradas".
 * Lista as missões recorrentes em 2 colunas (Semanais | Datas específicas),
 * cada uma com lápis (editar tudo) e X (remover).
 */
export function PreconfiguredMissions({
  missions,
  onUpdateMission,
  onRemove,
}: PreconfiguredMissionsProps) {
  const [open, setOpen] = useState(false);
  // missão em edição no modal completo (ou null)
  const [editing, setEditing] = useState<Mission | null>(null);

  const weekly = useMemo(
    () => missions.filter((m) => m.schedule.type === "weekly"),
    [missions],
  );
  const dated = useMemo(
    () => missions.filter((m) => m.schedule.type === "dates"),
    [missions],
  );

  const total = weekly.length + dated.length;

  return (
    <section className="card-surface mt-6 overflow-hidden">
      {/* cabeçalho clicável (toggle) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand-light">
            <CalendarCog size={20} />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-soft">
              Missões pré-configuradas
            </h2>
            <p className="text-xs text-muted">
              Missões recorrentes agendadas — edite os dias ou remova.
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
            {total === 0 ? (
              <div className="border-t border-white/[0.06] p-8 text-center">
                <p className="text-sm text-muted">
                  Nenhuma missão recorrente ainda.
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted/70">
                  Crie uma missão em &quot;Nova missão&quot; usando Semanalmente ou Datas
                  específicas para vê-la aqui.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 border-t border-white/[0.06] p-5 md:grid-cols-2">
                <ScheduleColumn
                  title="Semanais"
                  icon={Repeat}
                  missions={weekly}
                  onEdit={setEditing}
                  onRemove={onRemove}
                />
                <ScheduleColumn
                  title="Datas específicas"
                  icon={CalendarDays}
                  missions={dated}
                  onEdit={setEditing}
                  onRemove={onRemove}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* modal completo para editar a missão selecionada (todos os campos) */}
      <NewMissionModal
        open={editing !== null}
        initialMission={editing}
        onClose={() => setEditing(null)}
        onSave={(id, values) => {
          onUpdateMission(id, values);
          setEditing(null);
        }}
      />
    </section>
  );
}

/** Coluna de um tipo de recorrência (Semanais ou Datas específicas). */
function ScheduleColumn({
  title,
  icon: Icon,
  missions,
  onEdit,
  onRemove,
}: {
  title: string;
  icon: typeof Repeat;
  missions: Mission[];
  onEdit: (m: Mission) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-ink/40 p-4">
      <header className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-brand-light" />
        <h3 className="font-display text-sm font-semibold text-soft">{title}</h3>
        <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted">
          {missions.length}
        </span>
      </header>

      {missions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 py-6 text-center text-xs text-muted">
          Nenhuma missão {title.toLowerCase()}.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {missions.map((m) => (
            <PreconfiguredRow
              key={m.id}
              mission={m}
              onEdit={() => onEdit(m)}
              onRemove={() => onRemove(m.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Linha de uma missão pré-configurada, com lápis e X (remover com confirmação). */
function PreconfiguredRow({
  mission,
  onEdit,
  onRemove,
}: {
  mission: Mission;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryBadge category={mission.category} />
          <ShiftBadge shift={mission.shift} />
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand-light">
          <Zap size={11} /> {mission.xp} XP
        </span>
      </div>

      <p className="text-sm font-medium text-soft">{mission.title}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-brand/5 px-2.5 py-1 text-xs text-brand-light">
          {describeSchedule(mission.schedule)}
        </span>

        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Remover?</span>
            <button
              type="button"
              onClick={onRemove}
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
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Editar agendamento"
              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-muted transition-colors hover:border-brand/40 hover:text-brand-light"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Remover missão"
              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-muted transition-colors hover:border-rose-400/40 hover:text-rose-300"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
