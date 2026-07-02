/**
 * Dados e lógica do Modo Foco (estudos cronometrados).
 *
 * Cada sessão concluída vira uma missão concluída do dia (na área escolhida) e
 * credita XP conforme a duração escolhida (ver FOCUS_OPTIONS).
 */

/** Uma opção de duração do foco, com o rótulo e o XP que rende. */
export interface FocusOption {
  /** duração em minutos. */
  minutes: number;
  /** rótulo curto exibido no botão (ex.: "15m", "1h"). */
  label: string;
  /** XP creditado ao concluir a sessão desta duração. */
  xp: number;
}

/**
 * Durações disponíveis do Modo Foco e o XP de cada uma.
 * 15m → 10 XP · 30m → 25 XP · 1h → 50 XP.
 */
export const FOCUS_OPTIONS: FocusOption[] = [
  { minutes: 15, label: "15m", xp: 10 },
  { minutes: 30, label: "30m", xp: 25 },
  { minutes: 60, label: "1h", xp: 50 },
];

/** Busca a opção por minutos (ou a primeira, como fallback). */
export function focusOptionByMinutes(minutes: number): FocusOption {
  return FOCUS_OPTIONS.find((o) => o.minutes === minutes) ?? FOCUS_OPTIONS[0];
}

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
