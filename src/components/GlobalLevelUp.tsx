"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { LevelUpOverlay } from "./LevelUpOverlay";
import { useAppStats, type LevelUpCelebration } from "@/hooks/AppStateProvider";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { useCharacterSkin } from "@/hooks/useCharacterSkin";
import { useAttackAnimationPref } from "@/hooks/useAttackAnimationPref";
import { ATTACK, attackBudgetMs } from "@/lib/animations";
import { LU_ART_TIMEOUT_MS, LU_GATE_CEILING_MS } from "@/lib/levelUpChoreography";
import { SKIN_TIERS, levelArtTier, skinTierLabel } from "@/data/characterClasses";

/** Espera o decode da arte, com teto — evita o personagem em branco no frame mais visível. */
function decodeWithCap(src: string | null, capMs: number): Promise<void> {
  if (!src) return Promise.resolve();
  return Promise.race([
    new Promise<void>((res) => {
      const img = new window.Image();
      img.onload = () => res();
      img.onerror = () => res();
      img.src = src; // mesma URL da tag, porque o <Image> é `unoptimized`
    }),
    new Promise<void>((res) => setTimeout(res, capMs)),
  ]);
}

/**
 * Liga a celebração de subida de nível ao estado global e decide QUANDO ela
 * pode aparecer. Montado uma única vez, no layout do app.
 */
export function GlobalLevelUp() {
  const { levelUp, dismissLevelUp, progress } = useAppStats();
  const { characterClass } = useCharacterClass();
  const { resolveImage } = useCharacterSkin();
  const { disabled: attackOff } = useAttackAnimationPref();
  const reduce = useReducedMotion() === true;

  // O último payload precisa sobreviver ao exit do AnimatePresence.
  const lastRef = useRef<LevelUpCelebration | null>(null);
  if (levelUp) lastRef.current = levelUp;
  const shown = levelUp ?? lastRef.current;

  const [armed, setArmed] = useState(false);

  const artSrc = characterClass && shown ? resolveImage(characterClass, shown.level) : null;
  const prevArtSrc = characterClass && shown ? resolveImage(characterClass, shown.fromLevel) : null;

  /**
   * FAIXA e IMAGEM são conceitos separados.
   *
   * `crossedTier` decide a MENSAGEM de desbloqueio; `artSrc !== prevArtSrc`
   * decide o cross-fade. Quando o usuário fixou uma roupa antiga em "Trocar
   * roupa", as duas imagens são iguais e não há cross-fade — mas o desbloqueio
   * aconteceu e não pode ser engolido em silêncio no único momento em que
   * subir de nível entrega alguma coisa.
   */
  const crossedTier = !!shown && levelArtTier(shown.level) !== levelArtTier(shown.fromLevel);
  const tierLabel = shown ? skinTierLabel(levelArtTier(shown.level)) : null;
  const nextTierLevel = shown ? (SKIN_TIERS.find((t) => t > shown.level) ?? null) : null;
  const xpToNext = shown ? Math.max(0, progress.xpForNextLevel - progress.xpIntoLevel) : 0;

  /**
   * Portão de exibição. Quatro condições, um só lugar:
   *
   * 1) ATRASO — a conclusão de missão também dispara a coreografia do boss,
   *    mas ela SÓ EXISTE em /missions (BossBattleRow é montado apenas lá).
   *    Fora dali, esperar seria tempo morto olhando para nada. Detectamos a
   *    arena no DOM em vez de adivinhar pela página. E o orçamento inclui
   *    ATTACK.scrollMaxWaitMs, porque startBurst ROLA antes de caminhar
   *    (useBossAttackChoreography.ts:229) — sem isso o overlay abriria no meio
   *    da estocada, e o `overflow: hidden` da nossa trava mataria o tween de
   *    rolagem da coreografia.
   * 2) ABA ESCONDIDA — o rAF congela numa aba de fundo e, ao voltar, o framer
   *    salta tudo para o estado final: o usuário encontraria o arco já
   *    desenhado e nenhuma varredura. É o caso mais provável com usuário real,
   *    porque o Modo Foco usa setInterval(250), estrangulado a >=1000 ms em aba
   *    escondida — a conclusão dispara tarde e fora de vista.
   * 3) OUTRO MODAL ABERTO — stories/modal/SchedulePopover iniciados no meio da
   *    RPC. `:not([data-levelup])` exclui a nós mesmos, senão um segundo level
   *    up entraria num poll que só resolveria no Confirmar. E há TETO de 8 s:
   *    o SchedulePopover é `aria-modal` e o usuário pode ficar escolhendo data
   *    por minutos; o z-[80] cobre a sobreposição.
   * 4) DECODE DA ARTE, com teto de 400 ms.
   */
  useEffect(() => {
    if (!levelUp) {
      setArmed(false);
      return;
    }
    const hasArena =
      typeof document !== "undefined" && !!document.querySelector("[data-boss-arena]");
    const delayMs =
      levelUp.source !== "mission"
        ? 0
        : reduce
          ? 200
          : levelUp.bossDamage > 0 && !attackOff && hasArena
            ? ATTACK.scrollMaxWaitMs + attackBudgetMs(1) // 900 + 1707 = 2607 ms
            : 420;

    let interval: number | undefined;
    let ceiling: number | undefined;
    let cancelled = false;

    const canShow = () =>
      !document.hidden &&
      !document.querySelector('[role="dialog"][aria-modal="true"]:not([data-levelup])');

    const timer = window.setTimeout(async () => {
      await decodeWithCap(artSrc, LU_ART_TIMEOUT_MS);
      if (cancelled) return;
      if (canShow()) {
        setArmed(true);
        return;
      }
      interval = window.setInterval(() => {
        if (!canShow()) return;
        window.clearInterval(interval);
        setArmed(true);
      }, 300);
      ceiling = window.setTimeout(() => {
        window.clearInterval(interval);
        setArmed(true);
      }, LU_GATE_CEILING_MS);
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (interval) window.clearInterval(interval);
      if (ceiling) window.clearTimeout(ceiling);
    };
    // `artSrc` fora das deps de propósito: ele deriva de `levelUp` e re-rodar o
    // portão a cada refreshProfile reiniciaria o atraso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelUp, reduce, attackOff]);

  return (
    <LevelUpOverlay
      open={armed && !!levelUp}
      level={shown?.level ?? 1}
      fromLevel={shown?.fromLevel ?? 1}
      xp={shown?.xp ?? 0}
      xpToNext={xpToNext}
      wasCapped={shown?.wasCapped ?? false}
      reachedDailyLimit={shown?.reachedDailyLimit ?? false}
      artSrc={artSrc}
      prevArtSrc={prevArtSrc}
      crossedTier={crossedTier}
      tierLabel={tierLabel}
      nextTierLevel={nextTierLevel}
      preview={shown?.source === "simulation"}
      onConfirm={dismissLevelUp}
    />
  );
}
