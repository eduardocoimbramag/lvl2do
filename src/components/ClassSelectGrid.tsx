"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { CHARACTER_CLASSES, type CharacterClass } from "@/data/characterClasses";
import { cn } from "@/lib/utils";

interface ClassSelectGridProps {
  /** classe atualmente selecionada (ou null). */
  selected: CharacterClass | null;
  /** chamado ao clicar em um card. */
  onSelect: (id: CharacterClass) => void;
  /** desabilita a interação (ex.: durante o salvamento). */
  disabled?: boolean;
  className?: string;
}

/**
 * Grade de seleção de classe — 5 cards quadrados, 3 por linha (2 no mobile
 * estreito). Componente compartilhado entre a tela /onboarding e o modal de
 * "Trocar classe" no perfil.
 *
 * Arte placeholder (ícone) — quando as imagens chegarem, basta trocar a
 * renderização interna por <Image> mantendo a mesma estrutura.
 */
export function ClassSelectGrid({ selected, onSelect, disabled, className }: ClassSelectGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3", className)}>
      {CHARACTER_CLASSES.map((c) => {
        const Icon = c.icon;
        const active = selected === c.id;
        return (
          <motion.button
            type="button"
            key={c.id}
            onClick={() => onSelect(c.id)}
            disabled={disabled}
            whileHover={disabled ? undefined : { y: -3 }}
            whileTap={disabled ? undefined : { scale: 0.98 }}
            aria-pressed={active}
            className={cn(
              "group relative flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center transition-all",
              active
                ? "border-brand/60 bg-brand/10 shadow-glow"
                : "border-white/[0.06] bg-ink-card/80 hover:border-brand/40",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {active && (
              <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow-sm">
                <Check size={14} />
              </span>
            )}

            {/* arte placeholder (trocar por <Image> quando chegar) */}
            <span
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl border sm:h-20 sm:w-20",
                c.accent,
              )}
            >
              <Icon size={32} />
            </span>

            <div>
              <p className="font-display text-sm font-semibold text-soft sm:text-base">{c.id}</p>
              <p className="mt-0.5 text-[11px] text-muted sm:text-xs">{c.tagline}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
