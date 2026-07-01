-- ============================================================
-- lvl2do — FORÇAR reload do schema cache do PostgREST (xp_events)
-- ============================================================
-- Sintoma que isto resolve:
--   PGRST204 "Could not find the 'category' column of 'xp_events'
--   in the schema cache" (400 Bad Request ao registrar eventos de XP),
--   mesmo com a coluna existindo na tabela.
--
-- Consequência do bug: o histórico do gráfico de Métricas não é gravado.
--
-- Rode TODO este bloco no SQL Editor do Supabase.
-- ============================================================

-- 0) Garante (idempotente) que a tabela e as colunas existem.
create table if not exists public.xp_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null default 'gain',
  amount      integer not null,
  category    text,
  mission_id  uuid,
  created_at  timestamptz not null default now()
);

alter table public.xp_events add column if not exists kind       text not null default 'gain';
alter table public.xp_events add column if not exists amount     integer not null default 0;
alter table public.xp_events add column if not exists category   text;
alter table public.xp_events add column if not exists mission_id uuid;
alter table public.xp_events add column if not exists created_at timestamptz not null default now();

-- 1) RLS + policies (idempotente) — necessárias para o insert do usuário.
alter table public.xp_events enable row level security;

drop policy if exists "xp_events_select_own" on public.xp_events;
create policy "xp_events_select_own" on public.xp_events
  for select using (auth.uid() = user_id);

drop policy if exists "xp_events_insert_own" on public.xp_events;
create policy "xp_events_insert_own" on public.xp_events
  for insert with check (auth.uid() = user_id);

-- 2) Força o PostgREST a recarregar o schema cache (3 gatilhos redundantes).
notify pgrst, 'reload schema';
comment on table public.xp_events is 'lvl2do xp events (schema reload)';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
