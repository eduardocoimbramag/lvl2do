"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Zap, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MissionCard } from "@/components/MissionCard";
import { NewMissionModal } from "@/components/NewMissionModal";
import { Button } from "@/components/Button";
import { categoryMeta } from "@/components/CategoryBadge";
import { useMissions } from "@/hooks/useMissions";
import { CATEGORIES, type Category } from "@/data/types";
import { cn } from "@/lib/utils";

export default function MissionsPage() {
  const { missions, toggle, fail, addMission, stats } = useMissions();
  const [modalOpen, setModalOpen] = useState(false);
  // categoria pré-selecionada ao abrir o modal a partir de uma coluna
  const [targetCategory, setTargetCategory] = useState<Category | undefined>(undefined);

  // agrupa as missões por categoria (uma lista por card)
  const byCategory = useMemo(() => {
    const map = {} as Record<Category, typeof missions>;
    for (const c of CATEGORIES) map[c] = [];
    for (const m of missions) map[m.category]?.push(m);
    return map;
  }, [missions]);

  function openNewMission(category?: Category) {
    setTargetCategory(category);
    setModalOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Missões"
        subtitle="Organize suas tarefas em missões e conquiste XP."
        action={
          <Button onClick={() => openNewMission()}>
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

      {/* 3 cards/colunas por categoria */}
      <div className="grid gap-5 lg:grid-cols-3">
        {CATEGORIES.map((category) => (
          <CategoryColumn
            key={category}
            category={category}
            missions={byCategory[category]}
            onToggle={toggle}
            onFail={fail}
            onAdd={() => openNewMission(category)}
          />
        ))}
      </div>

      <NewMissionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={addMission}
        initialCategory={targetCategory}
      />
    </>
  );
}

/** Coluna/card de uma categoria, agrupando suas missões (estilo kanban). */
function CategoryColumn({
  category,
  missions,
  onToggle,
  onFail,
  onAdd,
}: {
  category: Category;
  missions: ReturnType<typeof useMissions>["missions"];
  onToggle: (id: string) => void;
  onFail: (id: string) => void;
  onAdd: () => void;
}) {
  const { icon: Icon, classes } = categoryMeta[category];
  const done = missions.filter((m) => m.status === "done").length;

  return (
    <section className="card-surface flex flex-col gap-4 p-4">
      {/* cabeçalho do card */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-xl border",
              classes,
            )}
          >
            <Icon size={18} />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-soft">{category}</h2>
            <p className="text-xs text-muted">
              {missions.length} {missions.length === 1 ? "missão" : "missões"}
              {missions.length > 0 && ` · ${done} concluída${done === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <button
          onClick={onAdd}
          aria-label={`Adicionar missão em ${category}`}
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-muted transition-colors hover:border-brand/40 hover:text-brand-light"
        >
          <Plus size={16} />
        </button>
      </header>

      {/* lista de missões da categoria */}
      <motion.div layout className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {missions.map((m) => (
            <MissionCard key={m.id} mission={m} onToggle={onToggle} onFail={onFail} />
          ))}
        </AnimatePresence>

        {missions.length === 0 && (
          <button
            onClick={onAdd}
            className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-10 text-center text-muted transition-colors hover:border-brand/40 hover:text-soft"
          >
            <ClipboardList size={26} />
            <span className="text-sm">Nenhuma missão aqui ainda.</span>
            <span className="inline-flex items-center gap-1 text-xs text-brand-light">
              <Plus size={13} /> Criar missão
            </span>
          </button>
        )}
      </motion.div>
    </section>
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
