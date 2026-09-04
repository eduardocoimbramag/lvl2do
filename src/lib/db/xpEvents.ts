import { createClient } from "@/lib/supabase/client";
import type { XpEventRow } from "@/types/database";

type LogXpEventInput = {
  userId: string;
  /** 'mission_done' | 'mission_reverted'. */
  reason: string;
  /** XP creditado (>0) ou devolvido (<0). */
  amount: number;
  missionId?: string | null;
  /** dia LOCAL do evento ("YYYY-MM-DD"). Padrão: hoje, pelo default do banco. */
  happenedOn?: string;
};

/**
 * Registra um evento de XP (log append-only).
 *
 * NÃO TEM CHAMADOR: quem escreve aqui são as RPCs atômicas de conclusão e
 * reversão, na mesma transação do crédito. Mantido alinhado ao schema real
 * para não voltar a mentir sobre as colunas da tabela.
 */
export async function logXpEvent(input: LogXpEventInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("xp_events").insert({
    user_id: input.userId,
    reason: input.reason,
    amount: input.amount,
    mission_id: input.missionId ?? null,
    ...(input.happenedOn ? { happened_on: input.happenedOn } : {}),
  });
  if (error) throw error;
}

/**
 * Eventos de XP do usuário (mais antigos primeiro).
 *
 * Colunas explícitas em vez de `*`: se o schema mudar de novo, o erro aponta a
 * coluna que pedimos, em vez de estourar silenciosamente num `order`. Foi
 * exatamente esse o bug — a query ordenava por `created_at`, coluna que não
 * existe nesta tabela, e devolvia 42703 para toda a página de Métricas.
 *
 * `userId` é exigido para o chamador não conseguir buscar antes de a sessão
 * existir (a RLS devolveria vazio, sem erro, e ninguém notaria).
 */
export async function getXpEvents(userId: string): Promise<XpEventRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("xp_events")
    .select("id,user_id,mission_id,amount,reason,daily_cap_applied,happened_on,happened_at")
    .eq("user_id", userId)
    .order("happened_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as XpEventRow[];
}
