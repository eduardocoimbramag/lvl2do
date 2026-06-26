/**
 * Lógica de streak (dias consecutivos com ao menos uma missão concluída).
 * Funções puras — a persistência vive em `useStreak` / AppStateProvider.
 *
 * Regra: o streak avança UMA vez por dia, na primeira conclusão do dia.
 * - já concluiu hoje  → sem mudança;
 * - concluiu ontem    → +1 (sequência mantida);
 * - antes de ontem / nunca → recomeça em 1.
 */
import { daysBetweenDateKeys } from "./xp-system";

export interface NextStreak {
  current: number;
  best: number;
  /** false quando já havia concluído hoje (nada muda). */
  changed: boolean;
}

export function computeNextStreak(opts: {
  /** dia ("YYYY-MM-DD") da última conclusão, ou null se nunca houve. */
  lastCompletedKey: string | null;
  currentStreak: number;
  bestStreak: number;
  /** dia atual ("YYYY-MM-DD"). */
  todayKey: string;
}): NextStreak {
  const { lastCompletedKey, currentStreak, bestStreak, todayKey } = opts;

  // já contou hoje → mantém tudo
  if (lastCompletedKey === todayKey) {
    return { current: currentStreak, best: bestStreak, changed: false };
  }

  // diferença em dias desde a última conclusão
  const gap = lastCompletedKey ? daysBetweenDateKeys(lastCompletedKey, todayKey) : Infinity;

  // ontem → mantém a sequência (+1); qualquer outro caso → recomeça em 1
  const current = gap === 1 ? currentStreak + 1 : 1;
  const best = Math.max(bestStreak, current);

  return { current, best, changed: true };
}
