"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { RankingPodium } from "@/components/RankingPodium";
import { RankingRow } from "@/components/RankingRow";
import { AnimatedGrid } from "@/components/Section";
import { useAuth } from "@/components/AuthProvider";
import { useAppStats } from "@/hooks/AppStateProvider";
import { useProfileIdentity } from "@/hooks/useProfileIdentity";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { isCharacterClass } from "@/data/characterClasses";
import { getTopProfiles, getFriends } from "@/lib/db/social";
import {
  xpForPeriod,
  type Player,
  type RankingPeriod,
  type RankingScope,
} from "@/data/social";

const SCOPES = ["Global", "Amigos"] as const satisfies readonly RankingScope[];
const PERIODS = ["Todos os tempos", "Anual"] as const satisfies readonly RankingPeriod[];

/**
 * Ranking real (Supabase): Global / Amigos × Todos os tempos / Anual.
 * "Global" lê os perfis públicos ordenados; "Amigos" lê os amigos do usuário.
 * O usuário atual entra com o estado ao vivo (XP/nível/streak/classe).
 */
export default function RankingPage() {
  const [scope, setScope] = useState<RankingScope>("Global");
  const [period, setPeriod] = useState<RankingPeriod>("Todos os tempos");
  const [pool, setPool] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const { user, profile } = useAuth();
  const { stats, progress, streak } = useAppStats();
  const { characterClass } = useCharacterClass();
  const { displayName, nickname } = useProfileIdentity();

  // jogador "você", derivado do estado real (ao vivo) do app
  const you: Player = useMemo(
    () => ({
      id: user?.id ?? "you",
      name: displayName ?? "Você",
      username: nickname ? nickname.toLowerCase().replace(/\s+/g, "") : "voce",
      level: progress.level,
      streak,
      characterClass: isCharacterClass(characterClass) ? characterClass : "Guerreiro",
      country: profile?.country ?? "br",
      totalXp: stats.totalXp,
      yearXp: profile?.year_xp ?? stats.totalXp,
    }),
    [user, displayName, nickname, progress.level, streak, characterClass, profile, stats.totalXp],
  );

  // carrega o pool conforme escopo/período
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    const load =
      scope === "Global"
        ? getTopProfiles(period === "Anual" ? "year_xp" : "total_xp", 50)
        : getFriends();
    load
      .then((rows) => {
        if (active) setPool(rows);
      })
      .catch((e) => {
        console.error("Erro ao carregar ranking:", e);
        if (active) setPool([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, scope, period]);

  const ranked = useMemo(() => {
    // usa a versão ao vivo de "você" (remove a cópia vinda do banco)
    const others = pool.filter((p) => p.id !== you.id);
    return [you, ...others].sort((a, b) => xpForPeriod(b, period) - xpForPeriod(a, period));
  }, [pool, you, period]);

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const yourRank = ranked.findIndex((p) => p.id === you.id) + 1;

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
              {scope} · {period} · {ranked.length} {ranked.length === 1 ? "jogador" : "jogadores"}
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

      {loading && scope === "Amigos" && pool.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 p-12 text-center">
          <Loader2 className="animate-spin text-brand-light" size={28} />
          <p className="text-sm text-muted">Carregando ranking…</p>
        </div>
      ) : (
        <>
          {/* pódio top 3 */}
          <RankingPodium players={top3} xpOf={(p) => xpForPeriod(p, period)} currentUserId={you.id} />

          {/* restante */}
          {rest.length > 0 && (
            <AnimatedGrid className="card-surface mt-5 divide-y divide-white/[0.06] overflow-hidden p-0">
              {rest.map((p, i) => (
                <RankingRow
                  key={p.id}
                  rank={i + 4}
                  player={p}
                  xp={xpForPeriod(p, period)}
                  isCurrentUser={p.id === you.id}
                />
              ))}
            </AnimatedGrid>
          )}
        </>
      )}
    </>
  );
}
