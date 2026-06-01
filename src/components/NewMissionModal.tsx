"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Zap } from "lucide-react";
import {
  CATEGORIES,
  DIFFICULTIES,
  SHIFTS,
  XP_BY_DIFFICULTY,
  type Category,
  type Difficulty,
  type Shift,
  type Mission,
} from "@/data/types";
import { shiftMeta } from "./CategoryBadge";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface NewMissionModalProps {
  open: boolean;
  onClose: () => void;
  /** cria a missão apenas em memória (sem salvar no banco) */
  onCreate: (mission: Mission) => void;
  /** categoria (card de destino) pré-selecionada ao abrir o modal */
  initialCategory?: Category;
}

/**
 * Modal visual de criação de missão.
 * IMPORTANTE: não salva dados no banco — apenas adiciona à lista local.
 */
export function NewMissionModal({ open, onClose, onCreate, initialCategory }: NewMissionModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>(initialCategory ?? "Profissional");
  const [difficulty, setDifficulty] = useState<Difficulty>("Fácil");
  const [shift, setShift] = useState<Shift>("Manhã");

  // Sincroniza o card de destino quando o modal é aberto a partir de uma coluna.
  useEffect(() => {
    if (open && initialCategory) setCategory(initialCategory);
  }, [open, initialCategory]);

  const xp = XP_BY_DIFFICULTY[difficulty];

  function handleSubmit() {
    if (!title.trim()) return;
    onCreate({
      id: `local-${title}-${xp}-${category}-${shift}`,
      title: title.trim(),
      category,
      difficulty,
      shift,
      status: "pending",
      xp,
    });
    setTitle("");
    setCategory(initialCategory ?? "Profissional");
    setDifficulty("Fácil");
    setShift("Manhã");
    onClose();
  }

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
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Nova missão"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="card-surface relative w-full max-w-lg rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-soft">Nova missão</h2>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-soft"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
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

              {/* categoria — define o card de destino da missão */}
              <div>
                <label className="mb-1.5 block text-sm text-muted">Categoria (card de destino)</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
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
                <div className="grid grid-cols-3 gap-2">
                  {SHIFTS.map((s) => {
                    const { icon: Icon } = shiftMeta[s];
                    const active = shift === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setShift(s)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-all",
                          active
                            ? "border-brand/50 bg-brand/15 text-brand-light"
                            : "border-white/10 bg-white/5 text-muted hover:text-soft",
                        )}
                      >
                        <Icon size={16} />
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* dificuldade */}
              <div>
                <label className="mb-1.5 block text-sm text-muted">Dificuldade</label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-all",
                        difficulty === d
                          ? "border-brand/50 bg-brand/15 text-brand-light"
                          : "border-white/10 bg-white/5 text-muted hover:text-soft",
                      )}
                    >
                      {d}
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                        <Zap size={10} /> {XP_BY_DIFFICULTY[d]} XP
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
                <span className="text-sm text-muted">Recompensa</span>
                <span className="inline-flex items-center gap-1.5 font-display font-semibold text-brand-light">
                  <Zap size={15} /> +{xp} XP
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={!title.trim()}>
                Criar missão
              </Button>
            </div>

            {/* NOTA: dados não são persistidos — apenas estado local. */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
