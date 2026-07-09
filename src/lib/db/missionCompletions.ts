import { createClient } from "@/lib/supabase/client";
import type { MissionRow, ProfileRow } from "@/types/database";

/**
 * RPCs ATÔMICAS de conclusão/reversão de missão (ver
 * supabase/2026-mission-completions.sql). Uma única transação no servidor
 * grava: mission_completions + profile (XP/level/orçamentos/streak) + status
 * da missão + xp_events. Ou tudo, ou nada — nunca mais "missão concluída sem
 * XP". O retorno traz o profile/mission JÁ atualizados para o cliente adotar.
 */

/** Retorno de complete_mission_atomic. */
export interface AtomicCompleteResult {
  profile: ProfileRow;
  mission: MissionRow | null;
  credited_xp: number;
  completed_for_date: string;
}

/** Retorno de revert_mission_atomic. */
export interface AtomicRevertResult {
  profile: ProfileRow;
  mission: MissionRow | null;
  reverted_xp: number;
  completed_for_date: string;
}

/** Uma conclusão ativa (para o mapa por-dia do cliente). */
export interface ActiveCompletion {
  mission_id: string;
  completed_for_date: string;
  credited_xp: number;
}

/**
 * Conclui a missão atomicamente para o dia informado (data LOCAL do cliente,
 * "YYYY-MM-DD"). Lança em falha — o chamador NÃO deve marcar a missão.
 * Erros de negócio identificáveis: "duplicate_completion", "mission_not_found".
 */
export async function completeMissionAtomic(
  missionId: string,
  dateKey: string,
): Promise<AtomicCompleteResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("complete_mission_atomic", {
    p_mission_id: missionId,
    p_completed_for_date: dateKey,
  });
  if (error) throw error;
  return data as AtomicCompleteResult;
}

/**
 * Desfaz a conclusão atomicamente. `dateKey` opcional: quando ausente, o
 * servidor reverte a conclusão ativa mais recente da missão.
 * Erro de negócio identificável: "completion_not_found".
 */
export async function revertMissionAtomic(
  missionId: string,
  dateKey?: string,
): Promise<AtomicRevertResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("revert_mission_atomic", {
    p_mission_id: missionId,
    p_completed_for_date: dateKey ?? null,
  });
  if (error) throw error;
  return data as AtomicRevertResult;
}

/**
 * Conclusões ATIVAS do usuário (para exibir o "feito por dia" das recorrentes
 * e o histórico do calendário). Limita ao passado recente por padrão.
 */
export async function getActiveCompletions(sinceDays = 400): Promise<ActiveCompletion[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const sinceKey = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(
    since.getDate(),
  ).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("mission_completions")
    .select("mission_id, completed_for_date, credited_xp")
    .is("reverted_at", null)
    .gte("completed_for_date", sinceKey);
  if (error) throw error;
  return (data ?? []) as ActiveCompletion[];
}
