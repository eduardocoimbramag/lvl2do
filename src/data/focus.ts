/**
 * Dados e lógica do Modo Foco (estudos cronometrados).
 *
 * Cada sessão concluída vira uma missão concluída do dia (na área escolhida) e
 * credita um XP fixo. Para mudar o valor do XP, ajuste FOCUS_XP_REWARD abaixo.
 */

/**
 * XP fixo creditado ao concluir uma sessão de foco.
 * Troque para 50 se quiser sessões valendo o mesmo que dificuldade "Difícil".
 */
export const FOCUS_XP_REWARD = 25;

/** Durações sugeridas (em minutos) oferecidas como atalhos na tela. */
export const FOCUS_PRESETS: number[] = [15, 25, 30, 45, 60, 90];

/** Limites do tempo personalizado (minutos). */
export const MIN_FOCUS_MINUTES = 1;
export const MAX_FOCUS_MINUTES = 180;

/** Formata segundos como "MM:SS" (ou "HH:MM:SS" acima de 1h). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** Descrição curta de uma duração em minutos (ex.: "1h 30min", "25 min"). */
export function describeMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
