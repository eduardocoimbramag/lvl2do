"use client";

import Image from "next/image";
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
 * "Trocar classe" no perfil. Cada card mostra a arte do personagem.
 */
export function ClassSelectGrid({ selected, onSelect, disabled, className }: ClassSelectGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3", className)}>
      {CHARACTER_CLASSES.map((c) => {
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
              "group relative aspect-square overflow-hidden rounded-2xl border text-left transition-all",
              active
                ? "border-brand/60 shadow-glow"
                : "border-white/[0.06] hover:border-brand/40",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {/* arte do personagem preenchendo o card */}
            <Image
              src={c.image}
              alt={`Classe ${c.id}`}
              fill
              sizes="(max-width: 640px) 45vw, 30vw"
              className={cn(
                "object-cover transition-transform duration-300",
                !disabled && "group-hover:scale-105",
              )}
            />

            {/* escurecido na base para legibilidade do nome */}
            <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

            {/* destaque quando selecionado */}
            {active && (
              <span className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-brand/60" />
            )}

            {active && (
              <span className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow-sm">
                <Check size={14} />
              </span>
            )}

            {/* nome + tagline sobre a arte */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-3 text-center">
              <p className="font-display text-sm font-semibold text-white drop-shadow sm:text-base">
                {c.id}
              </p>
              <p className="mt-0.5 text-[11px] text-white/75 sm:text-xs">{c.tagline}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
