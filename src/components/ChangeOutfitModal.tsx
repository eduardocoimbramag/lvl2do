"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Loader2, Sparkles } from "lucide-react";
import { SkinCarousel } from "./SkinCarousel";
import { Button } from "./Button";
import { useCharacterSkin } from "@/hooks/useCharacterSkin";
import {
  levelArtTier,
  type CharacterClass,
  type SkinTier,
} from "@/data/characterClasses";
import { cn } from "@/lib/utils";

interface ChangeOutfitModalProps {
  open: boolean;
  onClose: () => void;
  /** classe do personagem (define as artes). */
  characterClass: CharacterClass;
  /** nível atual (define desbloqueios e o tier automático). */
  level: number;
}

/**
 * Modal de troca de roupa (a partir do Perfil). Reaproveita o layout do
 * ChangeClassModal, com um carrossel de skins no lugar da grade de classes.
 *
 * Comportamento: por padrão a roupa segue o nível ("Automático"). O usuário
 * pode fixar uma skin de um nível já desbloqueado; o botão "Automático" volta
 * a deixar a roupa evoluir sozinha. A preferência é persistida no Clerk.
 */
export function ChangeOutfitModal({ open, onClose, characterClass, level }: ChangeOutfitModalProps) {
  const { skinPreference, isAuto, setSkinPreference } = useCharacterSkin();
  const autoTier = levelArtTier(level);

  // estado local: o tier destacado no carrossel + se está no modo automático
  const [draftAuto, setDraftAuto] = useState(isAuto);
  const [draftTier, setDraftTier] = useState<SkinTier>(
    skinPreference === "auto" ? autoTier : skinPreference,
  );
  const [saving, setSaving] = useState(false);

  // sincroniza ao (re)abrir com a preferência atual
  useEffect(() => {
    if (!open) return;
    setDraftAuto(isAuto);
    setDraftTier(skinPreference === "auto" ? autoTier : skinPreference);
  }, [open, isAuto, skinPreference, autoTier]);

  /** Selecionar um tier no carrossel fixa a roupa (sai do automático). */
  function handleSelectTier(tier: SkinTier) {
    setDraftTier(tier);
    setDraftAuto(false);
  }

  /** Voltar ao automático: roupa acompanha o nível; carrossel volta ao tier atual. */
  function handleAuto() {
    setDraftAuto(true);
    setDraftTier(autoTier);
  }

  async function handleConfirm() {
    if (saving) return;
    const next = draftAuto ? "auto" : draftTier;
    // sem mudança → apenas fecha
    if (next === skinPreference) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await setSkinPreference(next);
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
            aria-label="Trocar roupa"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="card-surface relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-soft">Trocar roupa</h2>
                <p className="text-xs text-muted">
                  Escolha o visual do seu {characterClass}. Skins de níveis mais altos desbloqueiam conforme você evolui.
                </p>
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

            {/* carrossel de skins */}
            <div className="overflow-hidden">
              <SkinCarousel
                characterClass={characterClass}
                level={level}
                selected={draftTier}
                onSelect={handleSelectTier}
                disabled={saving}
              />
            </div>

            {/* toggle automático */}
            <div className="mt-2 flex items-center justify-center">
              <button
                type="button"
                onClick={handleAuto}
                disabled={saving}
                aria-pressed={draftAuto}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60",
                  draftAuto
                    ? "border-brand/50 bg-brand/15 text-brand-light shadow-glow-sm"
                    : "border-white/10 bg-white/5 text-muted hover:border-brand/40 hover:text-soft",
                )}
              >
                <Sparkles size={15} />
                {draftAuto ? "Automático (segue o nível)" : "Voltar ao automático"}
              </button>
            </div>

            <div className="mt-5 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={saving}>
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
