"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";
import { ClassSelectGrid } from "./ClassSelectGrid";
import { Button } from "./Button";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { type CharacterClass } from "@/data/characterClasses";

interface ChangeClassModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal de troca de classe (a partir do Perfil). Reaproveita os cards da tela
 * de onboarding via ClassSelectGrid, com a classe atual já destacada.
 * Ao confirmar, persiste no Clerk (unsafeMetadata) e fecha.
 */
export function ChangeClassModal({ open, onClose }: ChangeClassModalProps) {
  const { characterClass, setCharacterClass } = useCharacterClass();
  const [selected, setSelected] = useState<CharacterClass | null>(characterClass);
  const [saving, setSaving] = useState(false);

  // Sincroniza a seleção com a classe atual ao (re)abrir o modal.
  useEffect(() => {
    if (open) setSelected(characterClass);
  }, [open, characterClass]);

  async function handleConfirm() {
    if (!selected || saving) return;
    // sem mudança → apenas fecha
    if (selected === characterClass) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await setCharacterClass(selected);
      onClose();
    } finally {
      setSaving(false);
    }
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
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Trocar classe"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="card-surface relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-soft">Trocar classe</h2>
                <p className="text-xs text-muted">Escolha a nova classe do seu personagem.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-soft"
              >
                <X size={18} />
              </button>
            </div>

            <div className="-mr-2 overflow-y-auto pr-2">
              <ClassSelectGrid selected={selected} onSelect={setSelected} disabled={saving} />
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={!selected || saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Confirmar
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
