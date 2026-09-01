import { createClient } from "@/lib/supabase/client";
import type { BossBattleState, MissionCategory } from "@/types/database";

/**
 * Boss Battles (widget TBH) — camada de dados (ver supabase/2026-boss-battles.sql).
 *
 * O DANO nunca passa por aqui: um trigger no servidor (sobre
 * mission_completions) aplica 2 de dano por conclusão 'done', com cap de
 * 5 hits/dia por boss e anti-double-hit por (usuário, missão, dia). O
 * cliente apenas LÊ o estado e dispara o reset manual quando hp = 0 —
 * assim o dano funciona de qualquer tela e não dá para forjar.
 *
 * Para refletir o dano na UI sem refetch agressivo: re-buscar em
 * onServerUpdate({kind:'complete'}) do useMissions (stats.done muda a cada
 * conclusão) — o trigger roda na MESMA transação da RPC, então o estado já
 * está atualizado quando a resposta chega.
 */

/**
 * Estado das 3 arenas do usuário (Profissional, Pessoal, Saúde) + hits de
 * hoje por boss. O servidor MATERIALIZA linhas ausentes: sempre chegam
 * exatamente 3 itens, com hp 100 no primeiro acesso.
 * `todayKey` = dia LOCAL do cliente ("YYYY-MM-DD", getLocalDateKey) — mesmo
 * contrato das RPCs de missão; o cap de hits é contado sobre esse dia.
 */
export async function getBossBattles(todayKey: string): Promise<BossBattleState[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_boss_battles", {
    p_today: todayKey,
  });
  if (error) throw error;
  return (data ?? []) as BossBattleState[];
}

/**
 * Coleta o tesouro e reseta o boss para 100 HP. SÓ funciona com hp = 0 —
 * o boss nunca reseta sozinho. Retorna o novo estado da arena (mesmo shape
 * de getBossBattles) para o cliente adotar sem refetch.
 * Erros de negócio identificáveis: "boss_not_defeated", "boss_not_found",
 * "invalid_category". (Recompensa ainda não implementada — requisito 3.)
 */
export async function collectBossTreasure(
  category: MissionCategory,
  todayKey: string,
): Promise<BossBattleState> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("collect_boss_treasure", {
    p_category: category,
    p_today: todayKey,
  });
  if (error) throw error;
  return data as BossBattleState;
}
