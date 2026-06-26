import { createClient } from "@/lib/supabase/client";
import { isCharacterClass } from "@/data/characterClasses";
import { getCurrentSeason } from "@/data/referral";
import type { Player } from "@/data/social";
import type { PublicProfileRow } from "@/types/database";

/** Linha da view pública → jogador do app (ranking/amigos). */
export function publicProfileToPlayer(row: PublicProfileRow): Player {
  const nick = row.nickname && row.nickname.length > 0 ? row.nickname : "Jogador";
  return {
    id: row.id,
    name: nick,
    username: nick.toLowerCase().replace(/\s+/g, ""),
    level: row.level,
    streak: row.current_streak,
    characterClass: isCharacterClass(row.character_class) ? row.character_class : "Guerreiro",
    country: row.country || "br",
    totalXp: row.total_xp,
    yearXp: row.year_xp,
  };
}

/* ------------------------------- Ranking --------------------------------- */

/** Top jogadores (ranking global), ordenados pela métrica do período. */
export async function getTopProfiles(
  orderBy: "total_xp" | "year_xp",
  limit = 50,
): Promise<Player[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .order(orderBy, { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as PublicProfileRow[]).map(publicProfileToPlayer);
}

/* -------------------------------- Amigos --------------------------------- */

/** Ids dos amigos do usuário logado. */
export async function getFriendIds(): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("friendships")
    .select("friend_id")
    .eq("user_id", user.id);
  if (error) throw error;
  return (data ?? []).map((r) => r.friend_id as string);
}

/** Amigos do usuário logado, já como jogadores. */
export async function getFriends(): Promise<Player[]> {
  const ids = await getFriendIds();
  if (ids.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase.from("public_profiles").select("*").in("id", ids);
  if (error) throw error;
  return ((data ?? []) as PublicProfileRow[]).map(publicProfileToPlayer);
}

/** Busca jogadores por nickname (aceita "Nick#TAG"). */
export async function searchProfiles(query: string, limit = 20): Promise<Player[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = createClient();

  let nick = q;
  let tag: string | null = null;
  if (q.includes("#")) {
    const [n, t] = q.split("#");
    nick = n.trim();
    tag = t.trim();
  }

  let builder = supabase
    .from("public_profiles")
    .select("*")
    .ilike("nickname", `%${nick}%`)
    .limit(limit);
  if (tag) builder = builder.ilike("tag", tag);

  const { data, error } = await builder;
  if (error) throw error;
  return ((data ?? []) as PublicProfileRow[]).map(publicProfileToPlayer);
}

/** Adiciona um amigo (amizade mútua, via RPC). */
export async function addFriend(targetId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("add_friend", { target: targetId });
  if (error) throw error;
}

/** Remove um amigo (ambos os lados, via RPC). */
export async function removeFriend(targetId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("remove_friend", { target: targetId });
  if (error) throw error;
}

/* --------------------------------- Loja ---------------------------------- */

/** Resgata um produto: debita cristais e registra. Retorna o novo saldo. */
export async function redeemProduct(input: {
  productId: string;
  productName: string;
  cost: number;
}): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("redeem_product", {
    p_product_id: input.productId,
    p_product_name: input.productName,
    p_cost: input.cost,
  });
  if (error) throw error;
  return data as number;
}

/* ------------------------------ Indicações ------------------------------- */

export interface ReferralSummary {
  /** indicações confirmadas (total). */
  total: number;
  /** indicações aguardando confirmação. */
  pending: number;
  /** indicações confirmadas na temporada atual. */
  thisSeason: number;
}

/** Resumo das indicações do usuário logado. */
export async function getReferralSummary(): Promise<ReferralSummary> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { total: 0, pending: 0, thisSeason: 0 };

  const { data, error } = await supabase
    .from("referrals")
    .select("status, confirmed_at")
    .eq("referrer_id", user.id);
  if (error) throw error;

  const rows = data ?? [];
  const season = getCurrentSeason();
  let total = 0;
  let pending = 0;
  let thisSeason = 0;
  for (const r of rows) {
    if (r.status === "confirmed") {
      total += 1;
      const at = r.confirmed_at ? new Date(r.confirmed_at) : null;
      if (at && at >= season.start && at < season.end) thisSeason += 1;
    } else {
      pending += 1;
    }
  }
  return { total, pending, thisSeason };
}
