-- ============================================================
-- lvl2do — schema inicial (rode no SQL Editor do Supabase)
-- Auth: Supabase Auth (auth.users). RLS por auth.uid().
-- ============================================================

-- ---------- util: updated_at automático ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ============================================================
-- PROFILES (1:1 com auth.users)
-- Guarda identidade (nickname + hashtag), classe/skin e progressão.
-- A unicidade do par nickname#tag é garantida pelo banco.
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  nickname    text,
  tag         text,
  avatar_url  text,
  character_class text not null default '',
  character_skin  text not null default '',
  total_xp        integer not null default 0,
  level           integer not null default 1,
  current_streak  integer not null default 0,
  best_streak     integer not null default 0,
  last_mission_completed_at timestamptz,
  member_since timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- mesmo nickname pode repetir; o par (nickname, tag) é único
  constraint profiles_nick_tag_unique unique (nickname, tag)
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- cria o profile automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- MISSIONS (alinhada com src/lib/db/missions.ts)
-- ============================================================
create table if not exists public.missions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  category    text not null,
  difficulty  text not null,
  shift       text not null,
  status      text not null default 'pending',
  xp          integer not null default 0,
  schedule_type     text not null default 'today',
  schedule_weekdays integer[] not null default '{}',
  schedule_dates    text[]    not null default '{}',
  completed_at timestamptz,
  failed_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists missions_user_id_idx on public.missions(user_id);

drop trigger if exists missions_set_updated_at on public.missions;
create trigger missions_set_updated_at
  before update on public.missions
  for each row execute function public.set_updated_at();

alter table public.missions enable row level security;

drop policy if exists "missions_select_own" on public.missions;
create policy "missions_select_own" on public.missions
  for select using (auth.uid() = user_id);

drop policy if exists "missions_insert_own" on public.missions;
create policy "missions_insert_own" on public.missions
  for insert with check (auth.uid() = user_id);

drop policy if exists "missions_update_own" on public.missions;
create policy "missions_update_own" on public.missions
  for update using (auth.uid() = user_id);

drop policy if exists "missions_delete_own" on public.missions;
create policy "missions_delete_own" on public.missions
  for delete using (auth.uid() = user_id);
