import type { Category } from "./types";
import type { CharacterBackgroundId } from "./characterBackgrounds";

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
  /** nome próprio curto, sabor medieval — a área já vem do CategoryBadge. */
  name: string;
  /** PNG 1254×1254 com alpha em public/bosses/. */
  image: string;
  /** cenário FIXO da arena. */
  backdrop: CharacterBackgroundId;
}

export const bossMeta: Record<Category, BossMeta> = {
  Profissional: { name: "Brasmor, o Dragão", image: "/bosses/dragonboss.png", backdrop: "castelo" },
  Pessoal: { name: "Aldric, o Cavaleiro", image: "/bosses/knightboss.png", backdrop: "trono" },
  Saúde: { name: "Gromak, o Orc", image: "/bosses/orcboss.png", backdrop: "floresta" },
};
