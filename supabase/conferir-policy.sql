-- ===========================================================================
-- SÓ RODE ISTO SE A ABA MÉTRICAS AINDA MOSTRAR 0
--
-- O espelho anterior provou que os dados estão certos e dentro da janela.
-- Sobrou uma única coisa que ele não conseguia enxergar: a REGRA da policy de
-- SELECT e para QUAL PAPEL ela vale.
--
-- Uma policy de SELECT que exista mas esteja apontada para o papel errado
-- (ex.: {anon} em vez de {authenticated}) devolve lista VAZIA com sucesso —
-- sem erro, sem banner, e a tela mostra três zeros. É o único suspeito restante.
--
-- Cole inteiro, clique em RUN e mande a foto. É só leitura.
-- ===========================================================================
select
  policyname                                  as "policy",
  cmd                                         as "comando",
  roles::text                                 as "vale para o papel",
  case
    when 'authenticated' = any(roles::text[]) then 'OK'
    when 'public'        = any(roles::text[]) then 'OK (public cobre authenticated)'
    else '>>> PROBLEMA: nao cobre o usuario logado <<<'
  end                                         as "cobre quem usa o app?",
  coalesce(qual, '(sem regra)')               as "regra (USING)"
from pg_policies
where schemaname = 'public'
  and tablename  = 'xp_events'
order by cmd, policyname;

-- ---------------------------------------------------------------------------
-- COMO LER
--
-- A linha com comando = SELECT e o que importa.
--
--  * "cobre quem usa o app?" = OK  e  regra = (auth.uid() = user_id)
--       -> a policy esta certa. O problema nao e o banco: e entrega no
--          navegador (sessao/cache). Nesse caso me avise que eu investigo o
--          lado do cliente.
--
--  * "cobre quem usa o app?" = PROBLEMA
--       -> ACHAMOS. A policy existe mas nao vale para quem esta logado.
--          Correcao (rode depois de me mandar a foto):
--            drop policy if exists "Users can read own xp events" on public.xp_events;
--            create policy "xp_events_select_own" on public.xp_events
--              for select to authenticated using (auth.uid() = user_id);
--
--  * regra diferente de (auth.uid() = user_id)
--       -> me mande a foto; a regra esta comparando a coisa errada.
-- ===========================================================================
