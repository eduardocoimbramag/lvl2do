-- ============================================================
-- lvl2do — migração: orçamento de XP retroativo (ontem)
-- Permite concluir missões esquecidas do dia anterior no Calendário de
-- missões, creditando no limite de 300 XP DE ONTEM (sem afetar o de hoje).
-- Rode no SQL Editor do Supabase (idempotente — pode rodar mais de uma vez).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Orçamento diário de ONTEM persistido no profile
--    Espelha daily_xp / daily_xp_date, mas para o dia anterior.
--    O app "rola" esses valores automaticamente quando vira o dia.
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists yesterday_xp integer not null default 0;

alter table public.profiles
  add column if not exists yesterday_xp_date date;

-- ------------------------------------------------------------
-- 2) Recarrega o cache de schema do PostgREST (evita erros de
--    "column not found in schema cache" logo após a migração).
-- ------------------------------------------------------------
notify pgrst, 'reload schema';
