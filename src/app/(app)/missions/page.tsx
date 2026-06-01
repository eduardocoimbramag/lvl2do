"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Zap, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MissionCard } from "@/components/MissionCard";
import { NewMissionModal } from "@/components/NewMissionModal";
import { Button } from "@/components/Button";
import { useMissions } from "@/hooks/useMissions";
import { CATEGORIES, type Category } from "@/data/types";
import { cn } from "@/lib/utils";

type Filter = "Todas" | Category;
const FILTERS: Filter[] = ["Todas", ...CATEGORIES];

export default function MissionsPage() {
  const { missions, toggle, addMission, stats } = useMissions();
  const [filter, setFilter] = useState<Filter>("Todas");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(
    () => (filter === "Todas" ? missions : missions.filter((m) => m.category === filter)),
    [missions, filter],
  );

  return (
    <>
      <PageHeader
        title="Missões"
        subtitle="Organize suas tarefas em missões e conquiste XP."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={18} /> Nova missão
          </Button>
        }
      />

      {/* resumo rápido */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Pill label="Total" value={stats.total} />
        <Pill label="Concluídas" value={stats.done} tone="success" />
        <Pill label="XP ganho" value={stats.xpEarned} icon />
      </div>

      {/* filtros por categoria (tabs locais) */}
      <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "relative shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                active ? "text-soft" : "text-muted hover:text-soft",
              )}
            >
              {active && (
                <motion.span
                  layoutId="mission-filter"
                  className="absolute inset-0 rounded-xl border border-brand/30 bg-brand/10"
                  transition={{ type: "spring", damping: 26, stiffness: 320 }}
                />
              )}
              <span className="relative">{f}</span>
            </button>
          );
        })}
      </div>

      {/* grid de missões */}
      <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((m) => (
            <MissionCard key={m.id} mission={m} onToggle={toggle} />
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <div className="card-surface mt-4 flex flex-col items-center gap-3 p-12 text-center">
          <ClipboardList className="text-muted" size={32} />
          <p className="text-sm text-muted">Nenhuma missão nesta categoria ainda.</p>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Criar missão
          </Button>
        </div>
      )}

      <NewMissionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={addMission}
      />
    </>
  );
}

function Pill({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone?: "success";
  icon?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-ink-card/60 px-4 py-2">
      <span className="text-sm text-muted">{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 font-display text-sm font-bold",
          tone === "success" ? "text-success" : "text-soft",
        )}
      >
        {icon && <Zap size={13} className="text-brand-light" />}
        {value}
      </span>
    </div>
  );
}
