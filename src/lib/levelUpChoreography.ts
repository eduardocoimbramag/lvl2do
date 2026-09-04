import { cubicBezier } from "framer-motion";

/**
 * Números da celebração de level up, em SEGUNDOS (unidade do framer-motion).
 *
 * Hierarquia deliberada: 0,26 / 0,46 / 0,84 ≈ 1 : 1,8 : 3,2. O arco é o mais
 * lento porque é o evento principal; se tudo durasse igual, leria como "várias
 * coisas começando juntas" e não como composição.
 *
 * Tipado com `number` de propósito, e NÃO com `as const`: em modo reduzido os
 * valores mudam, e um tipo literal (`dur: 0.26`) mentiria sobre o valor real.
 */
export type LevelUpTimings = {
  backdrop: { at: number; dur: number };
  character: { at: number; dur: number };
  arc: { at: number; dur: number };
  flash: { at: number; dur: number };
  tierSwap: { at: number; dur: number };
  chip: { at: number; dur: number };
  title: { at: number; dur: number };
  lines: { at: number; dur: number };
  button: { at: number; dur: number };
  exit: { content: number; backdrop: number; backdropDelay: number };
};

export const LU: LevelUpTimings = {
  backdrop: { at: 0, dur: 0.26 },
  character: { at: 0.1, dur: 0.44 },
  arc: { at: 0.18, dur: 0.84 }, // fecha em 1,02
  flash: { at: 1.02, dur: 0.3 },
  tierSwap: { at: 1.02, dur: 0.42 },
  chip: { at: 1.1, dur: 0.34 },
  title: { at: 1.16, dur: 0.52 },
  lines: { at: 1.42, dur: 0.28 },
  button: { at: 1.34, dur: 0.26 },
  exit: { content: 0.24, backdrop: 0.3, backdropDelay: 0.08 },
};

/** Ponto ÚNICO de verdade do reduced motion — em vez de 15 ternários espalhados. */
export function levelUpTimings(reduce: boolean): LevelUpTimings {
  if (!reduce) return LU;
  const flat = { at: 0, dur: 0.12 };
  return {
    backdrop: flat,
    character: flat,
    arc: { at: 0, dur: 0 },
    flash: { at: 0, dur: 0 },
    tierSwap: { at: 0, dur: 0.2 },
    chip: flat,
    title: flat,
    lines: flat,
    button: flat,
    exit: { content: 0.12, backdrop: 0.12, backdropDelay: 0 },
  };
}

/**
 * Depois deste orçamento as estrelas ASSENTAM em opacidade de repouso, com uma
 * transição de 1,2 s (cada uma desliza do valor em que estiver — o framer anima
 * a partir do estado atual, então ninguém congela no meio de um flash).
 *
 * 45 s e não 12: o overlay só fecha no botão, e 12 s expira enquanto uma pessoa
 * real ainda está lendo a linha de XP e reparando na arte nova.
 */
export const LU_SETTLE_MS = 45_000;
/** teto de espera pelo decode da arte antes de abrir mesmo assim. */
export const LU_ART_TIMEOUT_MS = 400;
/** teto da fila do portão: depois disso a celebração aparece de qualquer jeito. */
export const LU_GATE_CEILING_MS = 8_000;

/* ------------------------------- estrelas -------------------------------- */

const PHI = 0.618033988749895;
/** raio do traço do arco, em % do palco (viewBox 400 → r=180). */
const ARC_R = 45;
/** borda INTERNA do traço: 45 − (strokeWidth 6 / 2) / 4. */
const ARC_INNER = 44.25;
/** meia-extensão da caixa do personagem (50% do palco). */
const CHAR_HALF = 25;
/** folga mínima em qualquer direção. */
const GAP = 1.2;

/** inversa de EASE_TRAVEL [0.65,0,0.35,1] — a inversa de bezier(x1,y1,x2,y2) é bezier(y1,x1,y2,x2). */
const EASE_TRAVEL_INV = cubicBezier(0, 0.65, 1, 0.35);

/**
 * Tabela DETERMINÍSTICA calculada no escopo do módulo — idêntica no servidor e
 * no cliente, sem `Math.random`, sem risco de mismatch de hidratação. Mesmo
 * princípio do comentário "posições fixas (determinístico)" do AnimatedBackground.
 *
 * DUAS decisões de geometria, ambas verificadas por cálculo:
 *
 * 1) FOLGA POR CHEBYSHEV, não por raio. O personagem é uma CAIXA quadrada: o
 *    canto dela está a 25·√2 = 35,4% de raio. Testar "raio > 35,4" seria
 *    conservador demais nos eixos e ainda assim errado nas diagonais. Testar a
 *    distância de Chebyshev (max(|dx|,|dy|) > 25 + folga) é exato — e de quebra
 *    abre o campo: uma estrela às 12h pode chegar a 27% de raio, uma a 45° é
 *    empurrada para 40%. Isso dá DUAS profundidades reais em vez de uma fileira.
 *
 * 2) IGNIÇÃO POR ÂNGULO, não por projeção horizontal linear no tempo. A cabeça
 *    do arco no instante t está no ângulo φ = 180 ± 180·easeTravel(t). Sincronizar
 *    pelo ângulo — e desfazer o easing com a bezier inversa — faz o arco acender
 *    cada estrela EXATAMENTE ao passar por ela. Erro medido: 0,000000 grau.
 */
export const LU_STARS = Array.from({ length: 28 }, (_, i) => {
  const deg = (i * 137.508) % 360; // ângulo áureo: espalha sem agrupar
  const rad = (deg * Math.PI) / 180;
  const t = (i * PHI) % 1; // Weyl: variação estável e reproduzível
  const u = (i * PHI * 3) % 1;
  const c = Math.cos(rad);
  const s = Math.sin(rad);

  const size = 2.4 + u * 1.8; // 2,4%–4,2% do palco → 6–16 px
  const half = size / 2;
  const rMin = (CHAR_HALF + GAP + half) / Math.max(Math.abs(c), Math.abs(s));
  const rMax = ARC_INNER - GAP - half;
  const r = rMin + t * Math.max(0, rMax - rMin);

  // fração do PERCURSO em que a cabeça cruza o ângulo desta estrela:
  // metade de cima (0–180°) → a cabeça de cima chega vindo das 9h;
  // metade de baixo (180–360°) → a cabeça de baixo, simetricamente.
  const p = deg <= 180 ? 1 - deg / 180 : (deg - 180) / 180;

  return {
    left: 50 + c * r,
    top: 50 - s * r,
    size,
    /** fração de LU.arc.dur em que esta estrela acende. */
    ignite: EASE_TRAVEL_INV(p),
    cycle: 1.5 + u * 0.9,
    pause: 0.4 + t * 1.3,
    tone: i % 5 === 0 ? "#F8FAFC" : i % 3 === 0 ? "#C084FC" : "#A855F7",
    /** fatiamento por CSS: 18 no celular, 23 em sm, 28 em lg. Sem `window`. */
    tier: i < 18 ? "" : i < 23 ? "hidden sm:block" : "hidden lg:block",
  };
});

/** raio do traço, exportado para quem precisar conferir a geometria. */
export const LU_ARC_R = ARC_R;
