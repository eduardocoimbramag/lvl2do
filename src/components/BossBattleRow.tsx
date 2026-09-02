"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { BossBattleCard } from "./BossBattleCard";
import { useBossBattles } from "@/hooks/useBossBattles";
import { useBossAttackChoreography } from "@/hooks/useBossAttackChoreography";
import { useAttackAnimationPref } from "@/hooks/useAttackAnimationPref";
import { useAppStats } from "@/hooks/AppStateProvider";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { useCharacterSkin } from "@/hooks/useCharacterSkin";
import { CATEGORIES } from "@/data/types";
import { cn } from "@/lib/utils";

const INTRO_KEY = "lvl2do.attackIntro.v1";

/**
 * Fileira das 3 arenas TBH — dona de TODOS os hooks de dados e da coreografia
 * de ataque (um fetch serve os três cards; os cards são presentacionais).
 *
 * Este componente só é montado em /missions, que é o que restringe a animação
 * àquela aba: concluir uma missão pelo dashboard não tem ninguém ouvindo.
 */
export function BossBattleRow({ className }: { className?: string }) {
  const { status, bosses, refetch, collect, collecting, applyHit } = useBossBattles();
  // `level` vive em stats.level (useUserStats devolve { stats, ... }).
  const { stats } = useAppStats();
  const level = stats.level;
  const { characterClass } = useCharacterClass();
  const { resolveImage } = useCharacterSkin();
  const characterImage = characterClass ? resolveImage(characterClass, level) : null;

  const rowRef = useRef<HTMLElement | null>(null);
  const { disabled, hydrated } = useAttackAnimationPref();
  const reduce = useReducedMotion();
  const [intro, setIntro] = useState(false);

  /**
   * Sem personagem não há o que caminhar (o placeholder "Escolha sua classe"
   * deslizando pela arena seria pior que nada), e sem dados carregados a
   * coreografia seria feedback sobre nada.
   */
  const enabled =
    hydrated && !disabled && reduce !== true && characterImage !== null && status === "ready";

  const { attacks, onHit, onSettled, abort } = useBossAttackChoreography({
    enabled,
    rowRef,
    applyHit,
    onLegacyEvent: refetch,
    onFirstAttack: () => {
      try {
        if (localStorage.getItem(INTRO_KEY)) return;
        localStorage.setItem(INTRO_KEY, "seen");
      } catch {
        return;
      }
      setIntro(true);
      window.setTimeout(() => setIntro(false), 7000);
    },
  });

  return (
    <>
      <section
        ref={rowRef}
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
            attackId={attacks[category] ?? null}
            onHit={() => onHit(category)}
            onSettled={() => onSettled(category)}
            // abortar ANTES de coletar: o reset para 100 não pode chegar no
            // meio de uma investida contra o mesmo boss.
            onCollect={() => {
              abort();
              collect(category);
            }}
            collecting={collecting === category}
            onRetry={refetch}
          />
        ))}
      </section>

      {/* Estreia: na primeira vez o usuário vê a arena se mexer sozinha, e um
          "-2" sobre "100" não explica nada. Uma linha, uma vez, com o caminho
          para desligar — que ninguém acharia sozinho em Configurações. */}
      {intro && (
        <p className="mt-2 text-xs text-muted">
          Cada missão concluída fere o chefe da área — até 5 golpes por dia.{" "}
          <Link href="/settings" className="text-brand-light underline underline-offset-2">
            desativar animação
          </Link>
        </p>
      )}
    </>
  );
}
