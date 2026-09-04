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

/* -------------------------------------------------------------------------- */
/*  O PALCO E O ARCO                                                          */
/* -------------------------------------------------------------------------- */

/**
 * O palco NÃO é quadrado.
 *
 * Um semicírculo ocupa 2 de largura para 1 de altura. Num palco quadrado sobrava
 * um terço vazio embaixo do arco — e era essa sobra, e não uma margem mal
 * escolhida, que abria o buraco entre a chapa de nível e o título. Dimensionar o
 * palco pela figura que ele contém resolve o espaçamento na raiz, em vez de
 * disfarçá-lo com margem negativa.
 *
 * A altura é escolhida para que o CENTRO DO PERSONAGEM caia exatamente no centro
 * do palco (268 / 2 = 134 = cy do personagem): assim o palco continua sendo
 * centrado pelo grid e o personagem continua no centro exato da viewport.
 */
export const LU_STAGE = { w: 400, h: 268 } as const;

/**
 * MEIO-CÍRCULO exato — curvatura de círculo perfeito, 180°.
 *
 * Base na altura do pé do personagem; sobe até o ápice e desce até a outra
 * ponta, na mesma altura. Sem elipse: `rx === ry`, então a curvatura é constante
 * do começo ao fim.
 *
 * O raio 184 é o maior que cabe: 200 − 184 − 9 (meia-largura do bloom) = 7 de
 * folga em cada ponta e no ápice. Ele é quem determina o tamanho do personagem,
 * e não o contrário — ver LU_CHAR_PCT.
 */
export const LU_ARC = {
  cx: 200,
  /** base do arco = altura do pé do personagem. */
  cy: 200,
  r: 184,
  /** meia-largura do traço mais largo (bloom, strokeWidth 18). */
  strokeHalf: 9,
} as const;

/**
 * Um caminho só, da esquerda para a direita. Com `pathLength` de 0 a 1, a ponta
 * caminha da ponta esquerda até a direita — a varredura é o próprio desenho.
 * A corda (368) é igual a 2·r, então a solução é única: meio-círculo exato,
 * sem ambiguidade de large-arc.
 */
export const LU_ARC_PATH = `M ${LU_ARC.cx - LU_ARC.r} ${LU_ARC.cy} A ${LU_ARC.r} ${LU_ARC.r} 0 0 1 ${LU_ARC.cx + LU_ARC.r} ${LU_ARC.cy}`;

/** meia-extensão da caixa do personagem, em unidades do viewBox. */
const CHAR_HALF = 66;
/** centro da caixa do personagem: pé encostado na base do arco. */
const CHAR_CY = LU_ARC.cy - CHAR_HALF; // 134 — e 134 é o meio de 268
/** folga mínima entre estrela e qualquer vizinho (personagem ou traço). */
const GAP = 5;

/**
 * Lado do personagem, em % da LARGURA do palco (a caixa é quadrada).
 *
 * 33% é o MAIOR valor em que as 26 estrelas ainda cabem no corredor entre a
 * cabeça do personagem e o traço do arco — medido, não estimado. A 35% o
 * corredor cai para 27,5 unidades e três estrelas do topo ficam sem lugar.
 * Um semicírculo é mais raso que a elipse anterior, então o corredor superior
 * é o recurso escasso da composição: é ele que fixa este número.
 */
export const LU_CHAR_PCT = (CHAR_HALF * 2 * 100) / LU_STAGE.w; // 33

/** Distância da base do palco até o pé do personagem, em % da altura. */
export const LU_CHAR_BOTTOM_PCT = ((LU_STAGE.h - LU_ARC.cy) * 100) / LU_STAGE.h;
/** Altura da chapa de nível, no vão sob o arco, em % da altura do palco. */
export const LU_CHIP_TOP_PCT = ((LU_ARC.cy + 32) * 100) / LU_STAGE.h;

/* -------------------------------------------------------------------------- */
/*  AS ESTRELAS                                                               */
/* -------------------------------------------------------------------------- */

const PHI = 0.618033988749895;

/** inversa de EASE_TRAVEL [0.65,0,0.35,1] — a inversa de bezier(x1,y1,x2,y2) é bezier(y1,x1,y2,x2). */
const EASE_TRAVEL_INV = cubicBezier(0, 0.65, 1, 0.35);

/** Ponto do arco no ângulo `t`, escalado por `s` (1 = em cima do traço). */
function arcPoint(t: number, s = 1): [number, number] {
  return [LU_ARC.cx + s * LU_ARC.r * Math.cos(t), LU_ARC.cy + s * LU_ARC.r * Math.sin(t)];
}

/**
 * Campo de estrelas, determinístico (sem Math.random: idêntico no servidor e no
 * cliente, sem risco de mismatch de hidratação).
 *
 * POSIÇÃO — cada estrela nasce ancorada num ponto do arco e é puxada para dentro
 * até a faixa que ao mesmo tempo não encosta no traço e não invade a caixa
 * quadrada do personagem. O teste contra o personagem é por distância de
 * Chebyshev, que é a métrica exata para uma caixa: um teste por raio erraria nas
 * diagonais, justamente onde o corredor é mais apertado.
 *
 * INSTANTE — `ignite` é a fração de LU.arc.dur em que a ponta do arco cruza
 * aquela estrela. Como a ponta viaja com EASE_TRAVEL, desfazemos o easing com a
 * bezier inversa.
 *
 * NUM CÍRCULO o comprimento de arco é proporcional ao ângulo, então a fração do
 * caminho é o próprio ângulo normalizado. A tabela de integração numérica que
 * existia aqui só era necessária enquanto o arco era uma ELIPSE — onde as duas
 * grandezas divergem. Com a curvatura constante ela virou peso morto e saiu.
 */
export const LU_STARS = Array.from({ length: 26 }, (_, i) => {
  // espalha ao longo do arco com deslocamento áureo, para não virar um colar de
  // contas perfeitamente regular
  const base = (i + 0.5) / 26;
  const jitter = (((i * PHI) % 1) - 0.5) * (0.85 / 26);
  const p = Math.min(0.975, Math.max(0.025, base + jitter));
  const t = Math.PI + Math.PI * p;

  const u = (i * PHI * 3) % 1;
  const size = 2.0 + u * 1.4; // 2,0%–3,4% da largura do palco
  const half = size * 2; // meia-extensão em unidades do viewBox

  // maior escala que ainda deixa a estrela inteira do lado de dentro do traço
  const sMax = 1 - (LU_ARC.strokeHalf + GAP + half) / LU_ARC.r;

  let sHi: number | null = null;
  let sLo = sMax;
  for (let s = sMax; s > 0.3; s -= 0.002) {
    const [x, y] = arcPoint(t, s);
    const clearChar =
      Math.max(Math.abs(x - LU_ARC.cx), Math.abs(y - CHAR_CY)) - half > CHAR_HALF + GAP;
    // nunca abaixo da base: ali é o chão em que o personagem pisa
    const aboveFloor = y <= LU_ARC.cy + 0.5;
    if (clearChar && aboveFloor) {
      if (sHi === null) sHi = s;
      sLo = s;
    } else if (sHi !== null) break;
  }
  const s = sHi === null ? sMax : sLo + ((i * PHI * 7) % 1) * (sHi - sLo);
  const [x, y] = arcPoint(t, s);

  return {
    /** % da LARGURA do palco. */
    left: (x / LU_STAGE.w) * 100,
    /** % da ALTURA do palco — o palco não é quadrado, então os dois divisores diferem. */
    top: (y / LU_STAGE.h) * 100,
    size,
    /** fração de LU.arc.dur em que esta estrela acende. */
    ignite: EASE_TRAVEL_INV(p),
    cycle: 1.5 + u * 0.9,
    pause: 0.4 + ((i * PHI) % 1) * 1.3,
    tone: i % 5 === 0 ? "#F8FAFC" : i % 3 === 0 ? "#C084FC" : "#A855F7",
    /**
     * Fatiamento responsivo por CSS (sem ler `window`). O corte é por RESTO, e
     * não por faixa de índice: as estrelas estão ordenadas AO LONGO do arco,
     * então esconder um bloco contíguo deixaria um trecho às escuras.
     */
    tier: i % 7 === 3 ? "hidden lg:block" : i % 7 === 5 ? "hidden sm:block" : "",
  };
});
