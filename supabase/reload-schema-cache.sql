-- ============================================================
-- lvl2do — FORÇAR reload do schema cache do PostgREST
-- ============================================================
-- Sintoma que isto resolve:
--   PGRST204 "Could not find the 'daily_xp' column of 'profiles'
--   in the schema cache" (400 Bad Request ao salvar XP/eventos),
--   mesmo com a coluna existindo na tabela.
--
-- Causa: o PostgREST (camada REST do Supabase) mantém um cache do
-- schema. Após criar colunas (daily_xp, yesterday_xp, etc.), esse
-- cache pode não ter sido atualizado, e a API rejeita os upserts.
--
-- Rode TODO este bloco no SQL Editor do Supabase.
-- ============================================================

-- 0) Garante (idempotente) que as colunas de XP realmente existem.
--    Se já existirem, nada muda.
alter table public.profiles add column if not exists total_xp integer not null default 0;
alter table public.profiles add column if not exists level integer not null default 1;
alter table public.profiles add column if not exists daily_xp integer not null default 0;
alter table public.profiles add column if not exists daily_xp_date date;
alter table public.profiles add column if not exists yesterday_xp integer not null default 0;
alter table public.profiles add column if not exists yesterday_xp_date date;

-- 1) Notifica o PostgREST para recarregar o schema (forma padrão).
notify pgrst, 'reload schema';

-- 2) Reforço: recria/atualiza um comentário no schema — algumas versões
--    do PostgREST só invalidam o cache ao detectar um DDL de comentário.
comment on table public.profiles is 'lvl2do profiles (schema reload)';

-- 3) Notifica de novo, agora com config, para garantir o reload.
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
