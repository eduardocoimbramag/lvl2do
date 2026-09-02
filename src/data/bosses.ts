import type { Category } from "./types";

/**
 * Arenas fixas do widget TBH (uma por categoria de missão).
 *
 * O CENÁRIO aqui identifica a ÁREA (é fixo por arena), não segue a preferência
 * pessoal de fundo do jogador — são conceitos diferentes de propósito.
 *
 * As constantes espelham o servidor apenas para EXIBIÇÃO (pips, "70/100");
 * a verdade do dano/cap mora no trigger (supabase/2026-boss-battles.sql).
 */

export const BOSS_MAX_HP = 100;
export const BOSS_DAILY_HIT_CAP = 5;

export interface BossMeta {
  /** nome próprio curto, sabor medieval. */
  name: string;
  /** sprite do boss: PNG 1254×1254 com alpha. */
  image: string;
  /**
   * Cenário FIXO da arena: PNG 1536×1024 (3:2) sem alpha.
   * Identifica a ÁREA — não segue a preferência de fundo do jogador, que é
   * outro conceito (ver @/data/characterBackgrounds).
   */
  scene: string;
}

export const bossMeta: Record<Category, BossMeta> = {
  Profissional: {
    name: "Brasmor, o Dragão",
    image: "/bosses/dragonboss.png",
    scene: "/bosses/fundodragao.png",
  },
  Pessoal: {
    name: "Aldric, o Cavaleiro",
    image: "/bosses/knightboss.png",
    scene: "/bosses/fundocavaleiro.png",
  },
  Saúde: {
    name: "Gromak, o Orc",
    image: "/bosses/orcboss.png",
    scene: "/bosses/fundoorc.png",
  },
};
