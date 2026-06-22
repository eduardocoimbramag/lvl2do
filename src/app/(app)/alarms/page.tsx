"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, AlarmClock, BellRing, Power, Info } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { AlarmCard } from "@/components/AlarmCard";
import { NewAlarmModal, type AlarmDraft } from "@/components/NewAlarmModal";
import { AnimatedGrid } from "@/components/Section";
import { useAppAlarms } from "@/hooks/AppStateProvider";
import { useAlarmSound } from "@/hooks/useAlarmSound";
import {
  alarmFireTimes,
  alarmOccursOnDate,
  timeToMinutes,
  type Alarm,
} from "@/data/alarms";
import { cn } from "@/lib/utils";

export default function AlarmsPage() {
  const { alarms, hydrated, addAlarm, updateAlarm, removeAlarm, toggleEnabled, enabledCount } =
    useAppAlarms();
  const { playingId, preview } = useAlarmSound();

  const [modalOpen, setModalOpen] = useState(false);
  // alarme em edição (ou null = criação)
  const [editing, setEditing] = useState<Alarm | null>(null);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(alarm: Alarm) {
    setEditing(alarm);
    setModalOpen(true);
  }
  function handleSave(draft: AlarmDraft) {
    if (editing) updateAlarm(editing.id, draft);
    else addAlarm(draft);
  }

  // próximo toque de hoje (entre todos os alarmes ativos), para a pílula
  const nextFire = useMemo(() => computeNextFireToday(alarms), [alarms]);

  // ordena por horário do primeiro toque (ativos primeiro)
  const ordered = useMemo(() => {
    return [...alarms].sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return (timeToMinutes(a.time) ?? 0) - (timeToMinutes(b.time) ?? 0);
    });
  }, [alarms]);

  return (
    <>
      <PageHeader
        title="Alarmes"
        subtitle="Crie lembretes que tocam no horário — uma vez ou repetidos durante o dia."
        action={
          <Button onClick={openNew}>
            <Plus size={18} /> Novo alarme
          </Button>
        }
      />

      {/* resumo */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Pill icon={AlarmClock} label="Total" value={String(alarms.length)} />
        <Pill icon={Power} label="Ativos" value={String(enabledCount)} tone="success" />
        <Pill icon={BellRing} label="Próximo toque hoje" value={nextFire ?? "—"} />
      </div>

      {/* aviso de funcionamento (aba aberta) */}
      {alarms.length > 0 && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-brand/15 bg-brand/[0.06] px-4 py-3 text-xs text-muted">
          <Info size={15} className="mt-0.5 shrink-0 text-brand-light" />
          <p>
            Os alarmes tocam enquanto esta aba estiver aberta. Mantenha o lvl2do aberto para
            ouvir o som e receber a notificação no horário.
          </p>
        </div>
      )}

      {/* lista / estado vazio */}
      {!hydrated ? null : ordered.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 p-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 text-brand-light">
            <AlarmClock size={26} />
          </span>
          <p className="text-sm text-muted">Nenhum alarme ainda.</p>
          <p className="max-w-sm text-xs text-muted/70">
            Crie alarmes para lembrar de beber água, tomar remédios, fazer pausas e muito mais.
          </p>
          <Button variant="secondary" onClick={openNew} className="mt-1">
            <Plus size={16} /> Criar primeiro alarme
          </Button>
        </div>
      ) : (
        <AnimatedGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {ordered.map((alarm) => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                onToggle={toggleEnabled}
                onEdit={openEdit}
                onRemove={removeAlarm}
                onPreview={preview}
                previewingId={playingId}
              />
            ))}
          </AnimatePresence>
        </AnimatedGrid>
      )}

      <NewAlarmModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editing}
      />
    </>
  );
}

/**
 * Próximo horário ("HH:MM") em que algum alarme ativo ainda vai tocar hoje.
 * Considera recorrência semanal/datas e "uma vez". Retorna null se nenhum.
 */
function computeNextFireToday(alarms: Alarm[]): string | null {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let best: number | null = null;

  for (const alarm of alarms) {
    if (!alarm.enabled) continue;
    const occursToday = alarm.repeat.type === "once" ? true : alarmOccursOnDate(alarm, now);
    if (!occursToday) continue;

    for (const t of alarmFireTimes(alarm)) {
      const m = timeToMinutes(t);
      if (m === null) continue;
      if (m >= nowMinutes && (best === null || m < best)) best = m;
    }
  }

  if (best === null) return null;
  const h = Math.floor(best / 60);
  const min = best % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function Pill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof AlarmClock;
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-ink-card/60 px-4 py-2.5">
      <Icon size={16} className={tone === "success" ? "text-success" : "text-brand-light"} />
      <span className="text-sm text-muted">{label}</span>
      <span
        className={cn(
          "font-display text-sm font-bold tabular-nums",
          tone === "success" ? "text-success" : "text-soft",
        )}
      >
        {value}
      </span>
    </div>
  );
}
