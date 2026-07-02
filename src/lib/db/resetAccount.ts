import { createClient } from "@/lib/supabase/client";

/**
 * Chaves de localStorage que guardam estado do usuário (limpas no reset).
 * Mantém em sincronia com os hooks que persistem localmente.
 */
const LOCAL_KEYS = [
  "lvl2do.retroCompletions.v1", // conclusões por-dia (calendário)
  "lvl2do.alarms.v1", // alarmes
  "lvl2do.alarms.fired.v1", // disparos de alarme já feitos
  "lvl2do.notifications.v1", // notificações (sino)
  "lvl2do.tickets.v1", // tickets de suporte
  "lvl2do.focusSessions.v1", // histórico de sessões do Modo Foco
];

/**
 * MASTER RESET (ferramenta de DEV) — devolve a conta do usuário logado ao
 * estado "recém-criada", para testar o SaaS do zero.
 *
 * Apaga os dados do usuário (missões, eventos de XP, resgates, sociais) e
 * zera os campos de progressão no profile — SEM apagar a linha do profile nem
 * a identidade (nickname/tag/nome/país). Limpa também o estado local.
 *
 * Segurança: todas as tabelas têm RLS por usuário, então mesmo no cliente só é
 * possível remover/alterar as PRÓPRIAS linhas. A UI ainda restringe o acesso
 * (ver isDevUser). Ação IRREVERSÍVEL — confirme antes de chamar.
 *
 * @param options.resetOnboarding se true, limpa classe/skin (força a tela de
 *   escolha de classe de novo). Padrão: false.
 */
export async function resetMyAccount(options: { resetOnboarding?: boolean } = {}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const uid = user.id;

  // 1) apaga dados dependentes do usuário (RLS garante o escopo).
  //    Tolerante a falhas: se uma tabela não tiver policy de DELETE (ver
  //    supabase/reset-delete-policies.sql), apenas registra e segue — o profile
  //    ainda será zerado. Roda em paralelo.
  const del = async (label: string, run: () => PromiseLike<{ error: unknown }>) => {
    try {
      const { error } = await run();
      if (error) console.warn(`[resetMyAccount] ${label}:`, error);
    } catch (e) {
      console.warn(`[resetMyAccount] ${label} (exceção):`, e);
    }
  };

  await Promise.all([
    del("missions", () => supabase.from("missions").delete().eq("user_id", uid)),
    del("xp_events", () => supabase.from("xp_events").delete().eq("user_id", uid)),
    del("redemptions", () => supabase.from("redemptions").delete().eq("user_id", uid)),
    del("friendships", () =>
      supabase.from("friendships").delete().or(`user_id.eq.${uid},friend_id.eq.${uid}`),
    ),
    del("referrals", () =>
      supabase.from("referrals").delete().or(`referrer_id.eq.${uid},referred_id.eq.${uid}`),
    ),
  ]);

  // 2) zera a progressão no profile (mantém identidade)
  const profileReset: Record<string, number | string | null> = {
    total_xp: 0,
    level: 1,
    daily_xp: 0,
    daily_xp_date: null,
    yesterday_xp: 0,
    yesterday_xp_date: null,
    current_streak: 0,
    best_streak: 0,
    last_mission_completed_at: null,
    year_xp: 0,
    crystals: 0,
  };
  if (options.resetOnboarding) {
    profileReset.character_class = "";
    profileReset.character_skin = "";
  }
  await supabase.from("profiles").update(profileReset).eq("id", uid);

  // 3) limpa o estado local (localStorage)
  if (typeof window !== "undefined") {
    LOCAL_KEYS.forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {
        /* ignora */
      }
    });
  }
}
