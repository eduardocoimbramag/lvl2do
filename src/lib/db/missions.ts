import { createClient } from "@/lib/supabase/client";

export async function getMissions() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

type CreateMissionInput = {
  userId: string;
  title: string;
  description?: string;
  category: "Profissional" | "Pessoal" | "Saúde";
  difficulty: "Fácil" | "Média" | "Difícil";
  shift: "Manhã" | "Tarde" | "Noite";
  xp: number;
  scheduleType?: "today" | "weekly" | "dates";
  scheduleWeekdays?: number[];
  scheduleDates?: string[];
};

export async function createMission(input: CreateMissionInput) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("missions")
    .insert({
      user_id: input.userId,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      difficulty: input.difficulty,
      shift: input.shift,
      xp: input.xp,
      schedule_type: input.scheduleType ?? "today",
      schedule_weekdays: input.scheduleWeekdays ?? [],
      schedule_dates: input.scheduleDates ?? [],
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateMissionStatus(
  missionId: string,
  status: "pending" | "done" | "failed"
) {
  const supabase = createClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("missions")
    .update({
      status,
      completed_at: status === "done" ? now : null,
      failed_at: status === "failed" ? now : null,
    })
    .eq("id", missionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteMission(missionId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("missions")
    .delete()
    .eq("id", missionId);

  if (error) {
    throw error;
  }
}

export async function updateMissionSchedule(
  missionId: string,
  scheduleType: "today" | "weekly" | "dates",
  scheduleWeekdays: number[],
  scheduleDates: string[],
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("missions")
    .update({
      schedule_type: scheduleType,
      schedule_weekdays: scheduleWeekdays,
      schedule_dates: scheduleDates,
    })
    .eq("id", missionId);

  if (error) {
    throw error;
  }
}
