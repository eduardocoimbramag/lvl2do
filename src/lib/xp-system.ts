/**
 * Sistema central de XP / Level do lvl2do.
 *
 * Este arquivo contém apenas FUNÇÕES PURAS (sem React, sem efeitos colaterais),
 * para que a lógica de progressão seja testável e reutilizável. A camada de
 * estado/persistência vive em `useUserStats` (hook). Quando houver banco, basta
 * trocar a persistência — estas funções permanecem iguais.
 */

/** XP máximo que pode ser ganho em um único dia (evita farm infinito). */
export const DAILY_XP_LIMIT = 300;

/** XP perdido por cada dia inteiro sem concluir nenhuma missão. */
export const INACTIVE_DAY_XP_LOSS = 200;

/**
 * Estatísticas de progressão do usuário.
 * Datas usam a chave local "YYYY-MM-DD" (ver getLocalDateKey).
 */
export type UserStats = {
  /** XP acumulado total (nunca < 0). Define o level. */
  totalXp: number;
  /** Level atual — derivado de totalXp (mantido em sincronia ao gravar). */
  level: number;
  /** XP já ganho no dia de `dailyXpDate`. */
  dailyXp: number;
  /** Dia ao qual `dailyXp` se refere ("YYYY-MM-DD"). */
  dailyXpDate: string;
  /** Último dia em que o usuário concluiu ao menos uma missão. */
  lastMissionCompletedDate: string | null;
  /** Último dia já processado pela verificação de inatividade. */
  lastXpLossCheckDate: string | null;
};

/* -------------------------------------------------------------------------- */
/*  Datas                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Gera a chave de data LOCAL do usuário no formato "YYYY-MM-DD".
 * Usa componentes locais (não UTC) para evitar bugs de fuso horário.
 */
export function getLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Converte uma chave "YYYY-MM-DD" para uma Date local (meia-noite). */
function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Diferença em dias inteiros entre duas chaves de data (b - a). */
function daysBetween(aKey: string, bKey: string): number {
  const a = dateFromKey(aKey).getTime();
  const b = dateFromKey(bKey).getTime();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((b - a) / MS_PER_DAY);
}

/** Diferença em dias inteiros entre duas chaves "YYYY-MM-DD" (bKey - aKey). */
export function daysBetweenDateKeys(aKey: string, bKey: string): number {
  return daysBetween(aKey, bKey);
}

/* -------------------------------------------------------------------------- */
/*  Progressão de level (por faixas)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Custo de XP para sair do `level` informado e ir para o próximo, por faixa:
 * - 1..9   → 800   (até alcançar o Level 10)
 * - 10..49 → 1200  (até o Level 50)
 * - 50..99 → 1600  (até o Level 100)
 * - 100+   → 2000
 */
export function getXpRequiredForNextLevel(level: number): number {
  if (level < 10) return 800;
  if (level < 50) return 1200;
  if (level < 100) return 1600;
  return 2000;
}

/**
 * XP total acumulado necessário para ATINGIR o início de um dado level.
 * Level 1 = 0 XP. Level N = soma dos custos dos levels 1..N-1.
 */
export function getTotalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += getXpRequiredForNextLevel(l);
  }
  return total;
}

/**
 * Calcula o level a partir do XP total.
 * O level é sempre derivado do totalXp atual (pode subir e descer).
 */
export function calculateLevelFromXp(totalXp: number): number {
  const xp = Math.max(0, totalXp);
  let level = 1;
  // avança enquanto houver XP suficiente para o próximo level
  while (xp >= getTotalXpForLevel(level + 1)) {
    level++;
  }
  return level;
}

/**
 * Progresso dentro do level atual, a partir do XP total.
 * Retorna o XP atual no level, o necessário para o próximo e a % (0–100).
 */
export function calculateCurrentLevelProgress(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPct: number;
} {
  const xp = Math.max(0, totalXp);
  const level = calculateLevelFromXp(xp);
  const floor = getTotalXpForLevel(level);
  const xpForNextLevel = getXpRequiredForNextLevel(level);
  const xpIntoLevel = xp - floor;
  const progressPct = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));
  return { level, xpIntoLevel, xpForNextLevel, progressPct };
}

/* -------------------------------------------------------------------------- */
/*  Ganho de XP (com limite diário)                                            */
/* -------------------------------------------------------------------------- */

/**
 * Quanto XP é EFETIVAMENTE ganho ao concluir uma missão, respeitando o
 * limite diário. Ex.: já com 250/300 no dia, uma missão de 100 rende 50.
 */
export function calculateEarnedXpToday(currentDailyXp: number, missionXp: number): number {
  const remaining = Math.max(0, DAILY_XP_LIMIT - currentDailyXp);
  return Math.min(missionXp, remaining);
}

/** Resultado da aplicação de um ganho de XP. */
export type XpGainResult = {
  stats: UserStats;
  /** XP de fato creditado (após o limite diário). */
  earnedXp: number;
  /** XP base da missão (antes do limite). */
  baseXp: number;
  /** true se o limite diário foi atingido após este ganho. */
  reachedDailyLimit: boolean;
  /** true se o ganho foi reduzido pelo limite (earnedXp < baseXp). */
  wasCapped: boolean;
  levelBefore: number;
  levelAfter: number;
  /** níveis ganhos (>0 = level up). */
  levelDelta: number;
};

/**
 * Aplica o ganho de XP de uma missão sobre as estatísticas, considerando o
 * dia atual (`todayKey`) para o controle de limite diário.
 *
 * - Reseta o contador diário se `dailyXpDate` for de outro dia.
 * - Credita apenas o XP permitido pelo limite (300/dia).
 * - Recalcula o level a partir do novo totalXp.
 * - Atualiza `lastMissionCompletedDate` para o dia atual.
 */
export function applyXpGain(
  userStats: UserStats,
  missionXp: number,
  todayKey: string,
): XpGainResult {
  // garante que o contador diário corresponde ao dia atual
  const sameDay = userStats.dailyXpDate === todayKey;
  const dailyXpBase = sameDay ? userStats.dailyXp : 0;

  const earnedXp = calculateEarnedXpToday(dailyXpBase, missionXp);
  const newDailyXp = dailyXpBase + earnedXp;
  const newTotalXp = Math.max(0, userStats.totalXp + earnedXp);

  const levelBefore = userStats.level;
  const levelAfter = calculateLevelFromXp(newTotalXp);

  const stats: UserStats = {
    ...userStats,
    totalXp: newTotalXp,
    level: levelAfter,
    dailyXp: newDailyXp,
    dailyXpDate: todayKey,
    lastMissionCompletedDate: todayKey,
  };

  return {
    stats,
    earnedXp,
    baseXp: missionXp,
    reachedDailyLimit: newDailyXp >= DAILY_XP_LIMIT,
    wasCapped: earnedXp < missionXp,
    levelBefore,
    levelAfter,
    levelDelta: levelAfter - levelBefore,
  };
}

/** Resultado da reversão de um ganho de XP (ao desfazer uma conclusão). */
export type XpRevertResult = {
  stats: UserStats;
  /** XP de fato removido do total. */
  revertedXp: number;
  levelBefore: number;
  levelAfter: number;
  /** níveis perdidos na reversão (>0 = desceu de nível). */
  levelDrop: number;
};

/**
 * Reverte um ganho de XP (desfazer conclusão de missão), devolvendo
 * EXATAMENTE o que foi creditado (`creditedXp`) — importante quando o ganho
 * original foi reduzido pelo limite diário.
 *
 * - Subtrai `creditedXp` do totalXp (piso 0).
 * - Se a reversão acontece no MESMO dia do ganho (`dailyXpDate === todayKey`),
 *   também devolve o espaço no contador diário (reduz `dailyXp`, piso 0).
 *   Em outro dia, o contador diário já foi zerado — não há o que devolver.
 * - Recalcula o level (pode descer).
 */
export function applyXpRevert(
  userStats: UserStats,
  creditedXp: number,
  todayKey: string,
): XpRevertResult {
  const amount = Math.max(0, creditedXp);
  const newTotalXp = Math.max(0, userStats.totalXp - amount);
  const revertedXp = userStats.totalXp - newTotalXp;

  const sameDay = userStats.dailyXpDate === todayKey;
  const newDailyXp = sameDay ? Math.max(0, userStats.dailyXp - amount) : userStats.dailyXp;

  const levelBefore = userStats.level;
  const levelAfter = calculateLevelFromXp(newTotalXp);

  const stats: UserStats = {
    ...userStats,
    totalXp: newTotalXp,
    level: levelAfter,
    dailyXp: newDailyXp,
  };

  return {
    stats,
    revertedXp,
    levelBefore,
    levelAfter,
    levelDrop: levelBefore - levelAfter,
  };
}

/* -------------------------------------------------------------------------- */
/*  Perda de XP por inatividade                                                */
/* -------------------------------------------------------------------------- */

/**
 * Conta quantos dias INTEIROS já encerrados se passaram sem atividade,
 * entre `lastActivityDate` (exclusivo) e `currentDate` (exclusivo — o dia de
 * hoje ainda não terminou, então nunca é contado).
 *
 * Ex.: última atividade 2026-06-01, hoje 2026-06-04 →
 *      dias inativos = 2026-06-02 e 2026-06-03 → 2.
 *
 * Se nunca houve atividade (`lastActivityDate` null), não há perda
 * retroativa (não há ponto de partida para contar).
 */
export function getInactiveDays(
  lastActivityDate: string | null,
  currentDate: Date,
): number {
  if (!lastActivityDate) return 0;
  const todayKey = getLocalDateKey(currentDate);
  const diff = daysBetween(lastActivityDate, todayKey);
  // diff inclui o dia atual; dias encerrados sem atividade = diff - 1
  return Math.max(0, diff - 1);
}

/** Resultado da aplicação da perda por inatividade. */
export type XpLossResult = {
  stats: UserStats;
  inactiveDays: number;
  /** XP total perdido (inactiveDays * 200, limitado pelo piso 0). */
  xpLost: number;
  levelBefore: number;
  levelAfter: number;
  /** níveis perdidos (>0 = desceu de nível). */
  levelDrop: number;
};

/**
 * Aplica a perda de XP referente a `inactiveDays` dias inativos.
 * - Subtrai 200 XP por dia (sem deixar totalXp < 0).
 * - Recalcula o level (pode descer).
 * - NÃO altera datas de controle (isso é responsabilidade do hook, que marca
 *   `lastXpLossCheckDate` para evitar perda duplicada — ver checkInactiveDays).
 */
export function applyInactiveDayLoss(
  userStats: UserStats,
  inactiveDays: number,
): XpLossResult {
  const safeDays = Math.max(0, inactiveDays);
  const rawLoss = safeDays * INACTIVE_DAY_XP_LOSS;
  const newTotalXp = Math.max(0, userStats.totalXp - rawLoss);
  const xpLost = userStats.totalXp - newTotalXp;

  const levelBefore = userStats.level;
  const levelAfter = calculateLevelFromXp(newTotalXp);

  const stats: UserStats = {
    ...userStats,
    totalXp: newTotalXp,
    level: levelAfter,
  };

  return {
    stats,
    inactiveDays: safeDays,
    xpLost,
    levelBefore,
    levelAfter,
    levelDrop: levelBefore - levelAfter,
  };
}
