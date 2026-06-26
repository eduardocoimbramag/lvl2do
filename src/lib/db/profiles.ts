import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/types/database";

/** Lê o profile do usuário logado (ou null). */
export async function getMyProfile(): Promise<ProfileRow | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return null;
  return data as ProfileRow;
}

/** Atualiza campos do profile do usuário logado. */
export async function updateMyProfile(patch: Partial<ProfileRow>): Promise<ProfileRow> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  // upsert: cria a linha se ainda não existir (defensivo caso o trigger
  // de criação do profile não tenha rodado) ou atualiza a existente.
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...patch })
    .select()
    .single();

  if (error) throw error;
  return data as ProfileRow;
}
