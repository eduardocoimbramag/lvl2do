import { createClient } from "@/lib/supabase/client";
import type { XpEventRow } from "@/types/database";

type LogXpEventInput = {
  userId: string;
  kind: "gain" | "revert";
  /** XP creditado (>0) ou devolvido (<0). */
  amount: number;
  category?: string | null;
  missionId?: string | null;
  /**
   * Data/hora ISO do evento. Por padrão é "agora" (default do banco). Informe
   * para registrar uma conclusão retroativa (ex.: missão de ontem) na data
   * correta do histórico de métricas.
   */
  occurredAt?: string;
};

/** Registra um evento de XP (log append-only). Best-effort. */
export async function logXpEvent(input: LogXpEventInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("xp_events").insert({
    user_id: input.userId,
    kind: input.kind,
    amount: input.amount,
    category: input.category ?? null,
    mission_id: input.missionId ?? null,
    ...(input.occurredAt ? { created_at: input.occurredAt } : {}),
  });
  if (error) throw error;
}

/** Lê todos os eventos de XP do usuário logado (mais antigos primeiro). */
export async function getXpEvents(): Promise<XpEventRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("xp_events")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as XpEventRow[];
}
