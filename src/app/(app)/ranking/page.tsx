"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { RankingPodium } from "@/components/RankingPodium";
import { RankingRow } from "@/components/RankingRow";
import { AnimatedGrid } from "@/components/Section";
import { useAppStats } from "@/hooks/AppStateProvider";
import { useProfileIdentity } from "@/hooks/useProfileIdentity";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { isCharacterClass } from "@/data/characterClasses";
import { userProfile } from "@/data/mockStats";
import {
  GLOBAL_PLAYERS,
  MOCK_FRIENDS,
  xpForPeriod,
  type Player,
  type RankingPeriod,
  type RankingScope,
} from "@/data/social";

const SCOPES = ["Global", "Amigos"] as const satisfies readonly RankingScope[];
const PERIODS = ["Todos os tempos", "Anual"] as const satisfies readonly RankingPeriod[];
const YOU_ID = "you";

/**
 * Ranking (mock): Global / Amigos × Todos os tempos / Anual.
 * O usuário atual é inserido no ranking a partir do estado real (nível/XP/classe).
 */
export default function RankingPage() {
  const [scope, setScope] = useState<RankingScope>("Global");
  const [period, setPeriod] = useState<RankingPeriod>("Todos os tempos");

  const { stats, progress } = useAppStats();
  const { characterClass } = useCharacterClass();
  const { displayName, nickname } = useProfileIdentity();
  const { user } = useUser();

  // jogador "você" derivado do estado real do app
  const you: Player = useMemo(
    () => ({
      id: YOU_ID,
      name: displayName ?? userProfile.name,
      username: nickname ? nickname.toLowerCase().replace(/\s+/g, "") : user?.username || "voce",
      level: progress.level,
      streak: userProfile.streak,
      characterClass: isCharacterClass(characterClass) ? characterClass : "Guerreiro",
      country: "br",
      totalXp: stats.totalXp,
      yearXp: stats.totalXp,
    }),
    [displayName, nickname, user, progress.level, characterClass, stats.totalXp],
  );

  const ranked = useMemo(() => {
    const pool = scope === "Global" ? [you, ...GLOBAL_PLAYERS] : [you, ...MOCK_FRIENDS];
    return [...pool].sort((a, b) => xpForPeriod(b, period) - xpForPeriod(a, period));
  }, [scope, period, you]);

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const yourRank = ranked.findIndex((p) => p.id === YOU_ID) + 1;

  return (
    <>
      <PageHeader title="Ranking" subtitle="Veja quem está evoluindo mais rápido." />

      {/* filtros */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedToggle options={SCOPES} value={scope} onChange={setScope} layoutId="ranking-scope" />
        <SegmentedToggle
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          layoutId="ranking-period"
        />
      </div>

      {/* sua posição */}
      <motion.div
        key={`${scope}-${period}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card-surface mb-5 flex items-center justify-between gap-4 border-brand/30 p-4 shadow-glow-sm"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient font-display text-lg font-bold tabular-nums text-white shadow-glow-sm">
            {yourRank}
          </span>
          <div>
            <p className="text-sm font-semibold text-soft">Sua posição</p>
            <p className="text-xs text-muted">
              {scope} · {period} · {ranked.length} jogadores
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-bold tabular-nums text-soft">
            {xpForPeriod(you, period).toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-muted">XP</p>
        </div>
      </motion.div>

      {/* pódio top 3 */}
      <RankingPodium players={top3} xpOf={(p) => xpForPeriod(p, period)} currentUserId={YOU_ID} />

      {/* restante */}
      {rest.length > 0 && (
        <AnimatedGrid className="card-surface mt-5 divide-y divide-white/[0.06] overflow-hidden p-0">
          {rest.map((p, i) => (
            <RankingRow
              key={p.id}
              rank={i + 4}
              player={p}
              xp={xpForPeriod(p, period)}
              isCurrentUser={p.id === YOU_ID}
            />
          ))}
        </AnimatedGrid>
      )}
    </>
  );
}
