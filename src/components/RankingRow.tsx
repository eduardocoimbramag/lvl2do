"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { CharacterAvatar } from "./CharacterAvatar";
import { CountryFlag } from "./CountryFlag";
import { fadeUp } from "@/lib/animations";
import type { Player } from "@/data/social";
import { cn } from "@/lib/utils";

interface RankingRowProps {
  rank: number;
  player: Player;
  /** XP no período selecionado. */
  xp: number;
  isCurrentUser?: boolean;
}

/** Linha de um jogador na lista do ranking. */
export function RankingRow({ rank, player, xp, isCurrentUser }: RankingRowProps) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors sm:gap-4",
        isCurrentUser ? "bg-brand/10" : "hover:bg-white/[0.02]",
      )}
    >
      <span className="w-7 shrink-0 text-center font-display text-sm font-bold tabular-nums text-muted">
        {rank}
      </span>

      <CharacterAvatar
        characterClass={player.characterClass}
        level={player.level}
        size="sm"
        showLevel={false}
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium text-soft">
          <span className="truncate">{player.name}</span>
          {isCurrentUser && (
            <span className="shrink-0 rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-semibold text-brand-light">
              Você
            </span>
          )}
        </p>
        <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted">
          <span>Nível {player.level}</span>
          <span className="text-muted/40">·</span>
          <span>{player.characterClass}</span>
          <span className="inline-flex items-center gap-1 text-orange-400">
            <Flame size={11} fill="currentColor" /> {player.streak}
          </span>
        </p>
      </div>

      <CountryFlag code={player.country} />

      <div className="w-16 shrink-0 text-right sm:w-24">
        <p className="font-display text-sm font-bold tabular-nums text-soft">
          {xp.toLocaleString("pt-BR")}
        </p>
        <p className="text-[10px] text-muted">XP</p>
      </div>
    </motion.div>
  );
}
