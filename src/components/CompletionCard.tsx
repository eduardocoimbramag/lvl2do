"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CompletionRow {
  label: string;
  /** percentual de 0 a 100 */
  value: number;
}

interface CompletionCardProps {
  rows: CompletionRow[];
  className?: string;
}

/**
 * Cor por faixa de conclusão (paleta do projeto):
 * - 0–33%  → vermelho (rose)
 * - 33–66% → amarelo (amber)
 * - 66–100% → verde (success)
 */
function tone(value: number) {
  if (value < 33) return { bar: "bg-rose-400", text: "text-rose-300" };
  if (value < 66) return { bar: "bg-amber-400", text: "text-amber-300" };
  return { bar: "bg-success", text: "text-success" };
}

/**
 * Card "Conclusão do dia" — mesmo estilo dos cards de área (forte/fraca),
 * mas com várias barras de conclusão empilhadas, coloridas por faixa.
 */
export function CompletionCard({ rows, className }: CompletionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className={cn("card-glow flex flex-col p-5", className)}
    >
      <p className="text-xs uppercase tracking-widest text-muted">Conclusão do dia</p>

      <div className="mt-4 flex flex-1 flex-col justify-center gap-3.5">
        {rows.map((row) => {
          const t = tone(row.value);
          return (
            <div key={row.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-soft">{row.label}</span>
                <span className={cn("font-display text-sm font-bold", t.text)}>
                  {row.value}%
                </span>
              </div>
              {/* barra com a mesma aparência do ProgressBar, cor por faixa */}
              <div
                className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
                role="progressbar"
                aria-valuenow={row.value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Conclusão ${row.label}`}
              >
                <motion.div
                  className={cn("relative h-full rounded-full", t.bar)}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${row.value}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="absolute inset-0 overflow-hidden rounded-full">
                    <span className="absolute inset-y-0 -left-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  </span>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
