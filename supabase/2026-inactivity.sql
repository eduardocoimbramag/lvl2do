-- ============================================================
-- lvl2do — perda de XP por inatividade (auditoria A3)
-- ============================================================
-- Habilita a regra "−200 XP por dia inteiro sem concluir missões".
-- A coluna guarda o dia ("YYYY-MM-DD") da última CHECAGEM de inatividade,
-- para a perda ser aplicada UMA única vez por dia (idempotente entre
-- sessões/reloads). Sem esta coluna, o app mantém a regra DESLIGADA
-- automaticamente (proteção contra perda duplicada).
--
-- Rode no SQL Editor do Supabase. Idempotente.
-- ============================================================

alter table public.profiles
  add column if not exists last_xp_loss_check_date date;

-- recarrega o cache do PostgREST (evita PGRST204 pós-migração)
notify pgrst, 'reload schema';
