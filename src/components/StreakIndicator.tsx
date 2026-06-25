"use client";

import { Flame, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakIndicatorProps {
  /** dias consecutivos com pelo menos uma missão concluída. */
  days: number;
  className?: string;
}

/**
 * Cor do "foguinho" conforme a faixa de dias:
 *  - 1–6   → cinza (ainda sem bônus)
 *  - 7–29  → laranja (bônus de XP ×1,2 ativo)
 *  - 30+   → roxo da marca (bônus de XP ×1,5 ativo)
 *
 * NOTA: o sistema de streak ainda não está implementado — o valor exibido é
 * um placeholder (ver `userProfile.streak`). Aqui ficam apenas as regras visuais.
 */
function flameTone(days: number): { color: string; glow: string } {
  if (days >= 30) return { color: "text-brand-light", glow: "drop-shadow-[0_0_6px_rgba(192,132,252,0.65)]" };
  if (days >= 7) return { color: "text-orange-400", glow: "drop-shadow-[0_0_6px_rgba(251,146,60,0.55)]" };
  return { color: "text-muted", glow: "" };
}

/** Indicador compacto de streak (sequência de dias) com tooltip de bônus. */
export function StreakIndicator({ days, className }: StreakIndicatorProps) {
  const tone = flameTone(days);

  return (
    <div className={cn("flex flex-col items-end", className)}>
      {/* rótulo + botão de info */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Streak</span>

        <span className="group/streak relative inline-flex">
          <button
            type="button"
            aria-label="Como funciona o streak e os bônus de XP"
            className="flex h-4 w-4 items-center justify-center rounded-full border border-white/15 text-muted transition-colors hover:border-brand/40 hover:text-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            <Info size={10} />
          </button>

          {/* tooltip — aparece no hover/foco */}
          <span
            role="tooltip"
            className="pointer-events-none absolute right-0 top-6 z-30 w-60 rounded-xl border border-white/10 bg-ink-card/95 p-3 text-left opacity-0 shadow-glow backdrop-blur-sm transition-opacity duration-200 group-hover/streak:opacity-100 group-focus-within/streak:opacity-100"
          >
            <span className="block font-display text-xs font-semibold text-soft">
              Bônus de XP por streak
            </span>
            <span className="mt-1.5 block text-[11px] leading-relaxed text-muted">
              Conclua ao menos uma missão por dia para manter a sequência e ativar multiplicadores:
            </span>
            <span className="mt-2 flex items-center justify-between gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Flame size={12} className="text-orange-400" fill="currentColor" /> 7 dias
              </span>
              <span className="font-semibold text-orange-400">XP ×1,2</span>
            </span>
            <span className="mt-1 flex items-center justify-between gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Flame size={12} className="text-brand-light" fill="currentColor" /> 30 dias
              </span>
              <span className="font-semibold text-brand-light">XP ×1,5</span>
            </span>
          </span>
        </span>
      </div>

      {/* número de dias + foguinho */}
      <div className="mt-0.5 flex items-center gap-1.5">
        <span className="font-display text-2xl font-bold leading-none text-soft tabular-nums">
          {days}
        </span>
        <Flame size={20} className={cn(tone.color, tone.glow)} fill="currentColor" />
      </div>
      <span className="text-[10px] text-muted">{days === 1 ? "dia" : "dias"}</span>
    </div>
  );
}
