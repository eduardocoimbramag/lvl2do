"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";
import { Button } from "./Button";
import { ModalPortal } from "./ModalPortal";
import { CharacterBackdrop } from "./CharacterBackdrop";
import { useCharacterBackground } from "@/hooks/useCharacterBackground";
import {
  CHARACTER_BACKGROUNDS,
  type CharacterBackgroundId,
} from "@/data/characterBackgrounds";
import { cn } from "@/lib/utils";

interface ChangeBackgroundModalProps {
  open: boolean;
  onClose: () => void;
  /** arte do personagem, para o usuário ver o fundo COM ele na frente. */
  artSrc: string | null;
  alt: string;
}

/**
 * Modal de troca do fundo da moldura (a partir do Perfil).
 *
 * Cada opção é uma prévia real: o mesmo cenário vetorial e o mesmo personagem
 * que vão aparecer no card, em miniatura. Escolher um fundo por amostra de cor
 * seria adivinhação — o que importa é como a silhueta se lê sobre ele.
 */
export function ChangeBackgroundModal({ open, onClose, artSrc, alt }: ChangeBackgroundModalProps) {
  const { background, setBackground } = useCharacterBackground();
  const [draft, setDraft] = useState<CharacterBackgroundId>(background);
  const [saving, setSaving] = useState(false);

  // sincroniza ao (re)abrir com a preferência atual
  useEffect(() => {
    if (open) setDraft(background);
  }, [open, background]);

  async function handleConfirm() {
    if (saving) return;
    // sem mudança → apenas fecha
    if (draft === background) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await setBackground(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
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
              aria-label="Trocar fundo"
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="card-surface relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-soft">Trocar fundo</h2>
                  <p className="text-xs text-muted">
                    Escolha o cenário que fica atrás do seu personagem.
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

              <div
                role="radiogroup"
                aria-label="Cenário do personagem"
                className="-mr-2 grid grid-cols-2 gap-3 overflow-y-auto pr-2 sm:grid-cols-4 sm:gap-4"
              >
                {CHARACTER_BACKGROUNDS.map((option) => {
                  const selected = draft === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setDraft(option.id)}
                      disabled={saving}
                      className={cn(
                        "group rounded-2xl border p-2 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
                        selected
                          ? "border-brand/50 bg-brand/10 shadow-glow-sm"
                          : "border-white/10 bg-white/[0.02] hover:border-brand/40",
                      )}
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-ink">
                        <CharacterBackdrop background={option.id} />
                        {artSrc && (
                          <Image
                            src={artSrc}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 40vw, 160px"
                            className="relative object-cover"
                          />
                        )}
                        {selected && (
                          <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-gradient shadow-glow-sm">
                            <Check size={13} strokeWidth={3} className="text-white" />
                          </span>
                        )}
                      </div>

                      <p
                        className={cn(
                          "mt-2 truncate font-display text-sm font-semibold",
                          selected ? "text-brand-light" : "text-soft",
                        )}
                      >
                        {option.label}
                      </p>
                      <p className="line-clamp-2 text-[11px] leading-tight text-muted">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
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
    </ModalPortal>
  );
}
