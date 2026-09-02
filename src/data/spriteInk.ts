/**
 * Fração TRANSPARENTE da borda dos sprites que se encostam no ataque.
 *
 * As artes têm margem vazia dentro do PNG: medindo só a caixa do elemento, o
 * herói pararia golpeando ~30px de ar. Valores medidos no canal alfa das
 * imagens reais (limiar de 24/255, amostragem de 2 em 2 linhas).
 *
 * Herói: a arte é espelhada (-scale-x-100), então a borda que encosta no boss é
 * a ESQUERDA do arquivo original. Varia de 22,3% (bardo) a 26,5% (ladrão) entre
 * classes e tiers — 0,22 é o piso, escolhido para nunca invadir o boss.
 */
export const HERO_TRAILING_INK = 0.22;

/** Boss: borda esquerda do arquivo, que é a que o herói alcança. */
export const BOSS_LEADING_INK: Record<string, number> = {
  "/bosses/dragonboss.png": 0.014,
  "/bosses/knightboss.png": 0.007,
  "/bosses/orcboss.png": 0.084,
};

/** Fração vazia à esquerda do boss; 0 para arte desconhecida (nunca invade). */
export function bossLeadingInk(image: string): number {
  return BOSS_LEADING_INK[image] ?? 0;
}
