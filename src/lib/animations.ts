import type { Variants } from "framer-motion";

/**
 * Variants reutilizáveis de Framer Motion.
 * Mantém as animações consistentes e "premium" (suaves, sem exagero).
 */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Container que dispara o stagger nos filhos. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

/** Configuração padrão de viewport para animar ao entrar na tela. */
export const inViewport = { once: true, amount: 0.2 } as const;

/* -------------------------------------------------------------------------- */
/*  Ataque nas arenas TBH (ver useBossAttackChoreography)                      */
/* -------------------------------------------------------------------------- */

/** Curva da casa, a mesma de fadeUp/scaleIn. */
export const EASE_HOUSE = [0.22, 1, 0.36, 1] as const;
/** Viagem longa de scroll: ease-in-out, tangente inicial 0 (parte sem tranco). */
export const EASE_TRAVEL = [0.65, 0, 0.35, 1] as const;
/** Avanço: parte pronto e CHEGA a toda — quem freia o herói é o boss. */
export const EASE_ADVANCE = [0.28, 0.22, 0.75, 0.55] as const;
/** Estocada: tangente final alta, entra no contato batendo. */
export const EASE_LUNGE = [0.7, 0, 0.9, 0.3] as const;

export const ATTACK = {
  anticipationPx: 6,
  anticipation: 0.14,
  stepDuration: 0.21,
  stepPx: 46,
  minSteps: 2,
  maxSteps: 3,
  bobPx: 5,
  leanFwd: 3,
  /** contrapeso do recuo: maior que o da ida, é o que lê como "andando de costas". */
  leanBack: 4,
  lunge: 0.09,
  lungePx: 10,
  /** sobreposição de TINTA no contato (o vão transparente já saiu da conta). */
  contactOverlapPx: 6,
  hitstopMs: 160,
  /** intervalo entre estocadas quando várias conclusões coalescem. */
  multiBeatMs: 170,
  returnRatio: 0.9,
  settle: 0.12,
  bossRecoilPx: 8,
  bossRecoil: 0.34,
  flash: 0.11,
  /** teto de espera pelo scroll antes de soltar a caminhada. */
  scrollMaxWaitMs: 900,
  shadowRest: 0.55,
  shadowApex: 0.34,
} as const;

/**
 * Orçamento real de uma investida, em ms. O watchdog deriva daqui e nunca de um
 * número escrito à mão — é assim que um watchdog acaba disparando no meio do
 * retorno e corrompendo a fila.
 */
export function attackBudgetMs(hits: number, steps: number = ATTACK.maxSteps): number {
  const approach = steps * ATTACK.stepDuration;
  const extra = Math.max(0, hits - 1) * (ATTACK.multiBeatMs / 1000 + ATTACK.lunge);
  return Math.round(
    (ATTACK.anticipation +
      approach +
      ATTACK.lunge +
      extra +
      ATTACK.hitstopMs / 1000 +
      approach * ATTACK.returnRatio +
      ATTACK.settle) *
      1000,
  );
}

/**
 * Keyframes de passada: `steps` ciclos com ápice em 42% do passo — a subida é
 * mais rápida que a descida, que é o que dá peso. Todos os canais compartilham
 * o MESMO array `times`, então a sombra não sai de fase com o corpo.
 */
export function gaitKeyframes(steps: number, plant: number, apex: number) {
  const values = [plant];
  const times = [0];
  for (let i = 0; i < steps; i++) {
    times.push((i + 0.42) / steps, (i + 1) / steps);
    values.push(apex, plant);
  }
  return { values, times };
}
