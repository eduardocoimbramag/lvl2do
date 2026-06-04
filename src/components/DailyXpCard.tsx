"use client";

import { motion } from "framer-motion";
import { Zap, AlertTriangle, Ban } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { cn } from "@/lib/utils";

interface DailyXpCardProps {
  used: number;
  limit: number;
  nearLimit: boolean;
  reachedLimit: boolean;
  className?: string;
}

/**
 * Card de XP diário: mostra "X / 300 XP", barra de progresso e os avisos
 * de proximidade / atingimento do limite diário.
 */
export function DailyXpCard({
  used,
  limit,
  nearLimit,
  reachedLimit,
  className,
}: DailyXpCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn("card-surface flex flex-col p-6", className)}
    >
      <div className="flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-display font-semibold text-soft">
          <Zap size={16} className="text-brand-light" /> XP diário
        </h3>
        <span
          className={cn(
            "font-display text-sm font-bold",
            reachedLimit ? "text-amber-300" : "text-soft",
          )}
        >
          {used} / {limit} XP
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-3">
        <ProgressBar
          value={used}
          max={limit}
          tone={reachedLimit ? "success" : "brand"}
        />

        {reachedLimit ? (
          <p className="inline-flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200/90">
            <Ban size={14} className="mt-0.5 shrink-0" />
            Limite diário de XP atingido. Você ainda pode concluir missões, mas elas
            não gerarão XP hoje.
          </p>
        ) : nearLimit ? (
          <p className="inline-flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200/90">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Você está perto do limite diário de XP. Priorize missões importantes.
          </p>
        ) : (
          <p className="text-xs text-muted">
            Faltam <span className="text-brand-light">{limit - used} XP</span> para o
            limite diário.
          </p>
        )}
      </div>
    </motion.div>
  );
}
