-- ============================================================
-- lvl2do — alinhar a tabela `profiles` (rode no SQL Editor)
-- Idempotente: adiciona só o que estiver faltando. Não apaga dados.
-- Use isto se a tabela já existia sem as colunas novas (nickname/tag/etc).
-- ============================================================

-- garante a tabela (caso não exista)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade
);

-- adiciona as colunas que o app precisa (se faltarem)
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists nickname text;
alter table public.profiles add column if not exists tag text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists character_class text not null default '';
alter table public.profiles add column if not exists character_skin text not null default '';
alter table public.profiles add column if not exists total_xp integer not null default 0;
alter table public.profiles add column if not exists level integer not null default 1;
alter table public.profiles add column if not exists current_streak integer not null default 0;
alter table public.profiles add column if not exists best_streak integer not null default 0;
alter table public.profiles add column if not exists last_mission_completed_at timestamptz;
alter table public.profiles add column if not exists member_since timestamptz not null default now();
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- unicidade do par (nickname, tag) — só cria se ainda não existir
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_nick_tag_unique') then
    alter table public.profiles add constraint profiles_nick_tag_unique unique (nickname, tag);
  end if;
end $$;

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS + policies (idempotente)
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- cria o profile automaticamente no signup
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

-- recarrega o cache de schema do PostgREST (resolve "column ... in the schema cache")
notify pgrst, 'reload schema';
