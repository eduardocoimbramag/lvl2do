-- ============================================================
-- Métricas — liberar a leitura do histórico de XP
--
-- Cole no SQL Editor e clique em Run. É seguro rodar mais de uma vez.
--
-- POR QUE: a tabela xp_events é a única do projeto sem GRANT explícito.
-- Todas as outras (missions, mission_completions, stories, boss_battles…)
-- concedem. Quem ESCREVE nela são as RPCs, que rodam como dono do banco e
-- ignoram permissão — por isso os eventos existem. Quem LÊ é o app, que
-- depende da permissão abaixo.
--
-- SEGURANÇA: isto NÃO expõe dados de ninguém. A regra de linha (RLS) continua
-- valendo — cada pessoa só enxerga os próprios eventos, porque a policy
-- xp_events_select_own exige auth.uid() = user_id. O GRANT apenas permite
-- que a consulta chegue até essa regra.
-- ============================================================

grant select on public.xp_events to authenticated;

-- recarrega o cache de schema do PostgREST
notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- CONFERIR (opcional) — deve listar SELECT para authenticated
-- ------------------------------------------------------------
select table_name, grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name = 'xp_events'
   and grantee = 'authenticated';
