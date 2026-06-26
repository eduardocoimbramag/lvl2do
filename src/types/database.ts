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
  avatar_url: string | null;
  character_class: string;
  character_skin: string;
  total_xp: number;
  level: number;
  current_streak: number;
  best_streak: number;
  last_mission_completed_at: string | null;
  member_since: string;
  created_at: string;
  updated_at: string;
};
