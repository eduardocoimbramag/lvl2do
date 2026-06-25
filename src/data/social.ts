import type { CharacterClass } from "./characterClasses";

/**
 * Camada mock do sistema social (amigos + ranking).
 * FUTURO: substituir por dados reais (API/banco). Nada aqui é persistido.
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

/** Amigos atuais (mock). */
export const MOCK_FRIENDS: Friend[] = [
  { id: "f1", name: "Marina Souza", username: "marina", level: 12, streak: 23, characterClass: "Arqueira", country: "br", totalXp: 9120, yearXp: 4300 },
  { id: "f2", name: "Lucas Pereira", username: "lpereira", level: 8, streak: 5, characterClass: "Guerreiro", country: "pt", totalXp: 5400, yearXp: 2600 },
  { id: "f3", name: "Aiko Tanaka", username: "aiko", level: 31, streak: 64, characterClass: "Bruxa", country: "jp", totalXp: 21800, yearXp: 9700 },
  { id: "f4", name: "Diego Fernández", username: "diegof", level: 17, streak: 12, characterClass: "Ladrão", country: "ar", totalXp: 12750, yearXp: 6100 },
  { id: "f5", name: "Sophie Laurent", username: "sophie", level: 6, streak: 3, characterClass: "Bardo", country: "fr", totalXp: 3950, yearXp: 1900 },
  { id: "f6", name: "Noah Müller", username: "noahm", level: 22, streak: 41, characterClass: "Guerreiro", country: "de", totalXp: 16400, yearXp: 7300 },
];

/** Sugestões para adicionar (mock). */
export const MOCK_SUGGESTED: Friend[] = [
  { id: "s1", name: "Camila Rocha", username: "camir", level: 10, streak: 9, characterClass: "Bruxa", country: "br", totalXp: 6800, yearXp: 3200 },
  { id: "s2", name: "Ethan Carter", username: "ethanc", level: 15, streak: 18, characterClass: "Arqueira", country: "us", totalXp: 11200, yearXp: 5400 },
  { id: "s3", name: "Yuna Kim", username: "yuna", level: 27, streak: 53, characterClass: "Ladrão", country: "kr", totalXp: 18900, yearXp: 8600 },
  { id: "s4", name: "Marco Rossi", username: "marcor", level: 13, streak: 7, characterClass: "Bardo", country: "it", totalXp: 9600, yearXp: 4100 },
  { id: "s5", name: "Olivia Brown", username: "oliviab", level: 19, streak: 30, characterClass: "Guerreiro", country: "ca", totalXp: 14300, yearXp: 6900 },
];

/** Jogadores do ranking global (mock) — além dos amigos. */
export const GLOBAL_PLAYERS: Player[] = [
  { id: "g1", name: "ShadowBlade", username: "shadowblade", level: 78, streak: 210, characterClass: "Ladrão", country: "kr", totalXp: 98750, yearXp: 41200 },
  { id: "g2", name: "Liang Wei", username: "liangwei", level: 65, streak: 180, characterClass: "Bruxa", country: "jp", totalXp: 84300, yearXp: 38900 },
  { id: "g3", name: "Emma Johnson", username: "emmaj", level: 59, streak: 142, characterClass: "Arqueira", country: "us", totalXp: 76100, yearXp: 35100 },
  { id: "g4", name: "Carlos Mendes", username: "carlosm", level: 54, streak: 99, characterClass: "Guerreiro", country: "br", totalXp: 69200, yearXp: 30400 },
  { id: "g5", name: "Hana Park", username: "hanap", level: 48, streak: 120, characterClass: "Bardo", country: "kr", totalXp: 61500, yearXp: 33800 },
  { id: "g6", name: "Liam Wilson", username: "liamw", level: 44, streak: 76, characterClass: "Guerreiro", country: "au", totalXp: 55800, yearXp: 26700 },
  { id: "g7", name: "Sofia Costa", username: "sofiac", level: 39, streak: 60, characterClass: "Bruxa", country: "pt", totalXp: 48200, yearXp: 24900 },
  { id: "g8", name: "Raj Patel", username: "rajp", level: 36, streak: 48, characterClass: "Ladrão", country: "in", totalXp: 43900, yearXp: 22100 },
  { id: "g9", name: "Anna Schmidt", username: "annas", level: 33, streak: 70, characterClass: "Arqueira", country: "de", totalXp: 39600, yearXp: 28300 },
  { id: "g10", name: "Tom de Vries", username: "tomdv", level: 29, streak: 22, characterClass: "Bardo", country: "nl", totalXp: 34100, yearXp: 15600 },
];

/** XP do jogador conforme o período do ranking. */
export type RankingPeriod = "Todos os tempos" | "Anual";
export type RankingScope = "Global" | "Amigos";

export function xpForPeriod(player: Player, period: RankingPeriod): number {
  return period === "Anual" ? player.yearXp : player.totalXp;
}
