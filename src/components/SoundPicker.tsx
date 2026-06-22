"use client";

import { motion } from "framer-motion";
import { Check, Play, Pause, Volume2, AlertCircle } from "lucide-react";
import { ALARM_SOUNDS } from "@/lib/alarm-sounds";
import { cn } from "@/lib/utils";

interface SoundPickerProps {
  /** id do som selecionado. */
  value: string;
  /** chamado ao escolher um som. */
  onChange: (id: string) => void;
  /** id tocando no preview (ou null). */
  playingId: string | null;
  /** alterna o preview de um som. */
  onPreview: (id: string) => void;
  /** ids cujo arquivo não pôde carregar (avisa "indisponível"). */
  missing: Set<string>;
  disabled?: boolean;
}

/**
 * Seletor de toque do alarme. Lista os sons do catálogo como cards clicáveis,
 * cada um com botão de pré-escuta (play/pause). O card selecionado fica
 * destacado; sons sem arquivo mostram um aviso discreto de indisponível.
 */
export function SoundPicker({
  value,
  onChange,
  playingId,
  onPreview,
  missing,
  disabled,
}: SoundPickerProps) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {ALARM_SOUNDS.map((sound) => {
        const Icon = sound.icon;
        const selected = value === sound.id;
        const playing = playingId === sound.id;
        const unavailable = missing.has(sound.id);
        return (
          <motion.button
            type="button"
            key={sound.id}
            onClick={() => onChange(sound.id)}
            disabled={disabled}
            whileTap={disabled ? undefined : { scale: 0.98 }}
            aria-pressed={selected}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
              selected
                ? "border-brand/60 bg-brand/10 shadow-glow-sm"
                : "border-white/[0.06] bg-white/[0.02] hover:border-brand/40 hover:bg-white/[0.04]",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {/* ícone do timbre */}
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                selected
                  ? "border-brand/30 bg-brand/15 text-brand-light"
                  : "border-white/10 bg-white/5 text-muted group-hover:text-soft",
              )}
            >
              <Icon size={18} />
            </span>

            {/* nome + hint */}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-soft">
                {sound.label}
                {selected && <Check size={14} className="text-brand-light" />}
              </p>
              {unavailable ? (
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-amber-300/90">
                  <AlertCircle size={11} /> Arquivo indisponível
                </p>
              ) : (
                <p className="mt-0.5 truncate text-xs text-muted">{sound.hint}</p>
              )}
            </div>

            {/* botão de pré-escuta (play/pause) */}
            <span
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onPreview(sound.id);
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !disabled) {
                  e.preventDefault();
                  e.stopPropagation();
                  onPreview(sound.id);
                }
              }}
              aria-label={playing ? `Parar ${sound.label}` : `Ouvir ${sound.label}`}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all",
                playing
                  ? "border-brand/50 bg-brand-gradient text-white shadow-glow-sm"
                  : "border-white/10 bg-white/5 text-muted hover:border-brand/40 hover:text-brand-light",
                disabled && "pointer-events-none",
              )}
            >
              {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
            </span>

            {/* indicador animado de "tocando" */}
            {playing && (
              <motion.span
                layoutId="sound-playing-ring"
                className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-brand/40"
                transition={{ type: "spring", damping: 26, stiffness: 320 }}
              />
            )}

            {/* selo de volume quando selecionado (canto) */}
            {selected && !playing && (
              <span className="pointer-events-none absolute right-2 top-2 text-brand-light/60">
                <Volume2 size={12} />
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
