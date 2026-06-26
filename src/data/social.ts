import type { CharacterClass } from "./characterClasses";

/**
 * Tipos e helpers do sistema social (amigos + ranking).
 * Os DADOS reais vêm do Supabase via `@/lib/db/social` (view `public_profiles`,
 * tabelas `friendships`/`referrals`). Este arquivo mantém só tipos e utilidades.
 */

export interface Player {
  id: string;
  name: string;
  /** handle sem o "@". */
  username: string;
  level: number;
  /** dias consecutivos (streak). */
  streak: number;
  characterClass: CharacterClass;
  /** código ISO-3166 alpha-2 (minúsculo), ex.: "br". */
  country: string;
  /** XP acumulado total — ranking "Todos os tempos". */
  totalXp: number;
  /** XP acumulado no ano corrente — ranking "Anual". */
  yearXp: number;
}

/** Um amigo tem o mesmo formato de um jogador. */
export type Friend = Player;

/** Países suportados (nome exibido + tooltip da bandeira). */
export const COUNTRIES: Record<string, string> = {
  br: "Brasil",
  us: "Estados Unidos",
  pt: "Portugal",
  jp: "Japão",
  de: "Alemanha",
  fr: "França",
  gb: "Reino Unido",
  es: "Espanha",
  ca: "Canadá",
  ar: "Argentina",
  mx: "México",
  kr: "Coreia do Sul",
  in: "Índia",
  au: "Austrália",
  it: "Itália",
  nl: "Países Baixos",
};

/** Resolve o país pelo código (ou null se desconhecido). */
export function getCountry(code: string): { code: string; name: string } | null {
  const name = COUNTRIES[code];
  return name ? { code, name } : null;
}

/** XP do jogador conforme o período do ranking. */
export type RankingPeriod = "Todos os tempos" | "Anual";
export type RankingScope = "Global" | "Amigos";

export function xpForPeriod(player: Player, period: RankingPeriod): number {
  return period === "Anual" ? player.yearXp : player.totalXp;
}
