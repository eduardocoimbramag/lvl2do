"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { RankingPodium } from "@/components/RankingPodium";
import { RankingRow } from "@/components/RankingRow";
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

      {loading && scope === "Amigos" && pool.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 p-12 text-center">
          <Loader2 className="animate-spin text-brand-light" size={28} />
          <p className="text-sm text-muted">Carregando ranking…</p>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {/* esquerda: pódio */}
          <RankingPodium players={top3} xpOf={(p) => xpForPeriod(p, period)} currentUserId={you.id} />

          {/* direita: classificação rolável com a sua posição fixa no rodapé */}
          <div className="card-surface flex flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h3 className="font-display text-sm font-semibold text-soft">Classificação</h3>
              <span className="text-xs text-muted">
                {scope} · {period} · {ranked.length} {ranked.length === 1 ? "jogador" : "jogadores"}
              </span>
            </div>

            {/* lista rolável (os 10 primeiros aparecem; role para ver mais) */}
            <div className="max-h-[36rem] min-h-0 flex-1 divide-y divide-white/[0.06] overflow-y-auto">
              {ranked.map((p, i) => (
                <RankingRow
                  key={p.id}
                  rank={i + 1}
                  player={p}
                  xp={xpForPeriod(p, period)}
                  isCurrentUser={p.id === you.id}
                />
              ))}
            </div>

            {/* sua posição — sempre visível, ancorada no rodapé */}
            <div className="border-t border-brand/25 bg-brand/[0.06]">
              <RankingRow
                rank={yourRank}
                player={you}
                xp={xpForPeriod(you, period)}
                isCurrentUser
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
