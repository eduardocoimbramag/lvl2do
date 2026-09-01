"use client";

import { BossBattleCard } from "./BossBattleCard";
import { useBossBattles } from "@/hooks/useBossBattles";
import { useAppStats } from "@/hooks/AppStateProvider";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { useCharacterSkin } from "@/hooks/useCharacterSkin";
import { CATEGORIES } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * Fileira das 3 arenas TBH — dona de TODOS os hooks de dados (um fetch serve
 * os três cards; os cards são presentacionais puros).
 */
export function BossBattleRow({ className }: { className?: string }) {
  const { status, bosses, refetch, collect, collecting } = useBossBattles();
  // `level` vive em stats.level (useUserStats devolve { stats, ... }).
  const { stats } = useAppStats();
  const level = stats.level;
  const { characterClass } = useCharacterClass();
  const { resolveImage } = useCharacterSkin();
  const characterImage = characterClass ? resolveImage(characterClass, level) : null;

  return (
    // cópia literal do grid das colunas de missões — casa a largura por coluna
    <section
      aria-label="Batalhas de chefe por área"
      className={cn("grid gap-5 lg:grid-cols-3", className)}
    >
      {CATEGORIES.map((category) => (
        <BossBattleCard
          key={category}
          category={category}
          boss={bosses?.[category] ?? null}
          status={status}
          characterImage={characterImage}
          characterLabel={characterClass ? `${characterClass} nível ${level}` : null}
          onCollect={() => collect(category)}
          collecting={collecting === category}
          onRetry={refetch}
        />
      ))}
    </section>
  );
}
