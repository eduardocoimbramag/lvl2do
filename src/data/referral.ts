/**
 * Sistema de indicações (mock, sem persistência).
 *
 * Regras de negócio:
 * - Uma indicação só CONTA quando o novo jogador mantém a assinatura por 15 dias
 *   (tempo suficiente para a 1ª cobrança no cartão ser concluída).
 * - Bônus exclusivo para JOGADORES NOVOS.
 * - A recompensa é convertida em "cristais de energia".
 * - Metas por temporada (6 meses) com checkpoints em 10/25/50/75/100.
 */

export type RewardToken =
  | { kind: "crystal"; amount: number }
  | { kind: "item"; key: "bracelet" | "shirt" | "cap" | "mystery"; label: string };

export interface Milestone {
  /** indicações necessárias no checkpoint. */
  target: number;
  rewards: RewardToken[];
}

/** Maior checkpoint (escala da barra de metas). */
export const SEASON_MAX = 100;

/** Cristais ganhos por indicação confirmada. */
export const CRYSTALS_PER_REFERRAL = 15;

/** Checkpoints da temporada e suas recompensas. */
export const MILESTONES: Milestone[] = [
  { target: 10, rewards: [{ kind: "crystal", amount: 15 }] },
  { target: 25, rewards: [{ kind: "crystal", amount: 30 }] },
  {
    target: 50,
    rewards: [
      { kind: "item", key: "bracelet", label: "Pulseira" },
      { kind: "crystal", amount: 30 },
    ],
  },
  {
    target: 75,
    rewards: [
      { kind: "item", key: "shirt", label: "Camisa" },
      { kind: "item", key: "cap", label: "Boné" },
    ],
  },
  { target: 100, rewards: [{ kind: "item", key: "mystery", label: "Prêmio misterioso" }] },
];

/** Estado de indicações do usuário (mock). */
export const referralStats = {
  inviteCode: "EDU7F3K",
  inviteUrl: "https://lvl2do.app/r/EDU7F3K",
  /** convidados CONFIRMADOS (houve cobrança no cartão). */
  totalInvited: 18,
  /** convidados aguardando os 15 dias (ainda não contam). */
  pending: 3,
  /** cristais de energia acumulados. */
  crystals: 240,
  /** indicações confirmadas na temporada atual. */
  referralsThisSeason: 32,
};

export interface Season {
  number: number;
  start: Date;
  end: Date;
  daysLeft: number;
  totalDays: number;
}

/**
 * Temporada atual (janelas fixas de 6 meses, ancoradas em 01/04/2026).
 * Calcula quantos dias faltam para o fim.
 */
export function getCurrentSeason(now: Date = new Date()): Season {
  const anchor = new Date(2026, 3, 1); // 1 de abril de 2026
  const monthsSince =
    (now.getFullYear() - anchor.getFullYear()) * 12 + (now.getMonth() - anchor.getMonth());
  const index = Math.max(0, Math.floor(monthsSince / 6));

  const start = new Date(anchor.getFullYear(), anchor.getMonth() + index * 6, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 6, 1);

  const DAY = 86_400_000;
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY));
  const totalDays = Math.round((end.getTime() - start.getTime()) / DAY);

  return { number: index + 1, start, end, daysLeft, totalDays };
}
