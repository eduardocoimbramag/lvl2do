"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { CharacterAvatar } from "./CharacterAvatar";
import { CountryFlag } from "./CountryFlag";
import type { Player } from "@/data/social";
import { cn } from "@/lib/utils";

interface RankingPodiumProps {
  /** top 3 já ordenados (1º, 2º, 3º). */
  players: Player[];
  xpOf: (p: Player) => number;
  currentUserId: string;
}

const MEDAL: Record<1 | 2 | 3, { ring: string; text: string; bar: string; pedestal: string }> = {
  1: { ring: "ring-amber-400/60", text: "text-amber-300", bar: "from-amber-400/30 to-amber-400/[0.03]", pedestal: "h-24" },
  2: { ring: "ring-slate-300/50", text: "text-slate-200", bar: "from-slate-300/25 to-slate-300/[0.03]", pedestal: "h-20" },
  3: { ring: "ring-orange-500/50", text: "text-orange-300", bar: "from-orange-500/25 to-orange-500/[0.03]", pedestal: "h-16" },
};

/** Pódio dos 3 primeiros (2º | 1º | 3º), com pedestais e medalhas. */
export function RankingPodium({ players, xpOf, currentUserId }: RankingPodiumProps) {
  // ordem visual: 2º à esquerda, 1º ao centro (maior), 3º à direita
  const slots = [
    { player: players[1], rank: 2 as const },
    { player: players[0], rank: 1 as const },
    { player: players[2], rank: 3 as const },
  ].filter((s) => s.player);

  return (
    <div className="card-surface relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-64 -translate-x-1/2 rounded-full bg-brand/15 blur-[80px]" />

      <div className="relative grid grid-cols-3 items-end gap-2 sm:gap-4">
        {slots.map(({ player, rank }) => {
          const medal = MEDAL[rank];
          const isYou = player.id === currentUserId;
          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: rank === 1 ? 0 : 0.1 }}
              className="flex flex-col items-center"
            >
              {rank === 1 && <Crown size={20} className="mb-1 text-amber-300" />}

              <div className={cn("rounded-2xl ring-2 ring-offset-2 ring-offset-ink-card", medal.ring)}>
                <CharacterAvatar
                  characterClass={player.characterClass}
                  level={player.level}
                  size={rank === 1 ? "lg" : "md"}
                />
              </div>

              <p className="mt-3 max-w-full truncate text-center text-sm font-semibold text-soft">
                {player.name}
              </p>

              <div className="mt-1 flex items-center gap-1.5">
                <CountryFlag code={player.country} />
                {isYou && (
                  <span className="rounded-full bg-brand/20 px-1.5 py-0.5 text-[9px] font-semibold text-brand-light">
                    Você
                  </span>
                )}
              </div>

              <p className="mt-1 font-display text-sm font-bold tabular-nums text-soft">
                {xpOf(player).toLocaleString("pt-BR")}
                <span className="text-[10px] font-normal text-muted"> XP</span>
              </p>

              {/* pedestal */}
              <div
                className={cn(
                  "mt-3 flex w-full items-start justify-center rounded-t-xl border-t border-white/10 bg-gradient-to-b pt-2.5",
                  medal.bar,
                  medal.pedestal,
                )}
              >
                <span className={cn("font-display text-2xl font-bold", medal.text)}>{rank}º</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
