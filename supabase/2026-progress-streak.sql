-- ============================================================
-- lvl2do — migração: streak real, XP diário persistido e métricas reais
-- Rode no SQL Editor do Supabase (idempotente — pode rodar mais de uma vez).
-- ============================================================

-- ------------------------------------------------------------
-- 1) XP diário persistido no profile
--    (sobrevive ao reload; reseta a cada novo dia local no app)
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists daily_xp integer not null default 0;

alter table public.profiles
  add column if not exists daily_xp_date date;

-- (streak já existe: current_streak, best_streak, last_mission_completed_at)

-- ------------------------------------------------------------
-- 2) XP_EVENTS — log append-only de ganhos/reversões de XP
--    Necessário para o histórico real da página de Métricas:
--    a tabela `missions` guarda apenas o ÚLTIMO completed_at, então
--    não dá para reconstruir a série temporal sem este log.
-- ------------------------------------------------------------
create table if not exists public.xp_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null default 'gain',   -- 'gain' | 'revert'
  amount      integer not null,               -- creditado (>0) ou devolvido (<0)
  category    text,                            -- categoria da missão (opcional)
  mission_id  uuid,                            -- referência opcional à missão
  created_at  timestamptz not null default now()
);

create index if not exists xp_events_user_created_idx
  on public.xp_events (user_id, created_at);

alter table public.xp_events enable row level security;

drop policy if exists "xp_events_select_own" on public.xp_events;
create policy "xp_events_select_own" on public.xp_events
  for select using (auth.uid() = user_id);

drop policy if exists "xp_events_insert_own" on public.xp_events;
create policy "xp_events_insert_own" on public.xp_events
  for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3) Recarrega o cache de schema do PostgREST (evita erros de
--    "column not found in schema cache" logo após a migração).
-- ------------------------------------------------------------
notify pgrst, 'reload schema';
