export type MissionCategory = "Profissional" | "Pessoal" | "Saúde";
export type MissionDifficulty = "Fácil" | "Média" | "Difícil";
export type MissionShift = "Manhã" | "Tarde" | "Noite";
export type MissionStatus = "pending" | "done" | "failed";
export type MissionScheduleType = "today" | "weekly" | "dates";

export type MissionRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: MissionCategory;
  difficulty: MissionDifficulty;
  shift: MissionShift;
  status: MissionStatus;
  xp: number;
  schedule_type: MissionScheduleType;
  schedule_weekdays: number[];
  schedule_dates: string[];
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  name: string | null;
  nickname: string | null;
  tag: string | null;
  avatar_url: string | null;
  character_class: string;
  character_skin: string;
  total_xp: number;
  level: number;
  /** XP já ganho no dia de `daily_xp_date` (limite diário). */
  daily_xp: number;
  /** Dia ("YYYY-MM-DD") ao qual `daily_xp` se refere, ou null. */
  daily_xp_date: string | null;
  current_streak: number;
  best_streak: number;
  last_mission_completed_at: string | null;
  /** código ISO-3166 alpha-2 (minúsculo) do país. */
  country: string;
  /** saldo de cristais de energia (loja). */
  crystals: number;
  /** código único de indicação do usuário. */
  referral_code: string | null;
  /** XP acumulado no ano de `year_xp_year` (ranking anual). */
  year_xp: number;
  year_xp_year: number;
  member_since: string;
  created_at: string;
  updated_at: string;
};

/** Linha da view `public_profiles` (colunas públicas de qualquer jogador). */
export type PublicProfileRow = {
  id: string;
  nickname: string | null;
  tag: string | null;
  avatar_url: string | null;
  character_class: string;
  character_skin: string;
  level: number;
  total_xp: number;
  year_xp: number;
  current_streak: number;
  best_streak: number;
  country: string;
};

/** Linha de uma indicação. */
export type ReferralRow = {
  id: number;
  referrer_id: string;
  referred_id: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
};

/** Evento de XP (log append-only) — base do histórico de métricas. */
export type XpEventRow = {
  id: number;
  user_id: string;
  kind: "gain" | "revert";
  amount: number;
  category: string | null;
  mission_id: string | null;
  created_at: string;
};
