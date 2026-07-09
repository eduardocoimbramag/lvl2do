-- ============================================================
-- lvl2do — AUDITORIA de consistência do sistema de XP
-- ============================================================
-- Consultas de DETECÇÃO (somente leitura). Rode cada bloco no SQL Editor
-- para encontrar divergências entre missions / profiles / xp_events /
-- mission_completions. Resultado vazio = saudável.
--
-- Schema real de public.xp_events (sem coluna `kind`):
--   id, user_id, mission_id, amount, reason, daily_cap_applied,
--   happened_on (date), happened_at (timestamptz)
-- → GANHO de XP  = amount > 0
-- → REVERSÃO/PERDA = amount < 0
-- → data do evento = happened_on
-- ============================================================

-- ------------------------------------------------------------
-- 1) Usuários com missões concluídas mas total_xp = 0
--    (o clássico "missão concluída sem XP")
-- ------------------------------------------------------------
select p.id, p.nickname, p.total_xp,
       count(m.id) as missoes_concluidas
  from public.profiles p
  join public.missions m on m.user_id = p.id and m.status = 'done'
 where coalesce(p.total_xp, 0) = 0
 group by p.id, p.nickname, p.total_xp
 order by missoes_concluidas desc;

-- ------------------------------------------------------------
-- 2) Missões concluídas (status) SEM registro ativo em mission_completions
--    (esperado para conclusões anteriores à migração; novas não devem aparecer)
-- ------------------------------------------------------------
select m.user_id, m.id as mission_id, m.title, m.completed_at
  from public.missions m
 where m.status = 'done'
   and not exists (
     select 1 from public.mission_completions mc
      where mc.mission_id = m.id and mc.reverted_at is null
   )
 order by m.completed_at desc nulls last;

-- ------------------------------------------------------------
-- 3) Soma de xp_events ≠ profiles.total_xp
--    (tolerância 0; diferenças históricas podem existir de antes do log)
-- ------------------------------------------------------------
select p.id, p.nickname, p.total_xp,
       coalesce(e.soma_eventos, 0) as soma_eventos,
       p.total_xp - coalesce(e.soma_eventos, 0) as diferenca
  from public.profiles p
  left join (
    select user_id, sum(amount) as soma_eventos
      from public.xp_events
     group by user_id
  ) e on e.user_id = p.id
 where p.total_xp <> coalesce(e.soma_eventos, 0)
 order by abs(p.total_xp - coalesce(e.soma_eventos, 0)) desc;

-- ------------------------------------------------------------
-- 4) mission_completions ATIVAS sem xp_event de ganho correspondente
--    (a RPC grava ambos na mesma transação — não deve retornar nada).
--    Ganho = amount > 0; casa também pela data (happened_on).
-- ------------------------------------------------------------
select mc.user_id, mc.mission_id, mc.completed_for_date,
       mc.credited_xp, mc.completed_at
  from public.mission_completions mc
 where mc.reverted_at is null
   and not exists (
     select 1 from public.xp_events e
      where e.user_id = mc.user_id
        and e.mission_id = mc.mission_id
        and coalesce(e.amount, 0) > 0
        and e.happened_on = mc.completed_for_date
   )
 order by mc.completed_at desc;

-- ------------------------------------------------------------
-- 5) daily_xp do profile incoerente com as conclusões ativas do dia
--    (daily_xp deve = soma dos credited_xp ativos em daily_xp_date;
--     diferenças de contas antigas — pré-tabela — são esperadas)
-- ------------------------------------------------------------
select p.id, p.nickname, p.daily_xp_date, p.daily_xp,
       coalesce(c.soma_dia, 0) as soma_conclusoes_do_dia,
       p.daily_xp - coalesce(c.soma_dia, 0) as diferenca
  from public.profiles p
  left join (
    select user_id, completed_for_date, sum(credited_xp) as soma_dia
      from public.mission_completions
     where reverted_at is null
     group by user_id, completed_for_date
  ) c on c.user_id = p.id and c.completed_for_date = p.daily_xp_date
 where p.daily_xp_date is not null
   and p.daily_xp <> coalesce(c.soma_dia, 0)
 order by abs(p.daily_xp - coalesce(c.soma_dia, 0)) desc;
