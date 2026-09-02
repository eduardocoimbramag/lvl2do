-- ============================================================
-- lvl2do — correção do XP zerando + recuperação do XP perdido
-- Diagnóstico completo: docs/auditoriaxp.md
--
-- CONTEXTO: o cliente gravava `total_xp = 0` no profile a cada carregamento
-- de página, antes de o profile carregar. A correção no código já foi
-- aplicada (trava de semente em useUserStats + canal separado de orçamento).
-- Este arquivo faz o resto: RECUPERA o XP perdido e, opcionalmente, TIRA do
-- cliente o poder de escrever XP — para o bug não poder voltar por outro
-- caminho.
--
-- ORDEM OBRIGATÓRIA: só rode isto DEPOIS de publicar a correção no código.
-- Sem ela, o próximo carregamento de página zera tudo de novo.
--
-- Rode por partes, lendo cada uma. A parte 1 é só leitura.
-- ============================================================


-- ------------------------------------------------------------
-- PARTE 1 — DIAGNÓSTICO (somente leitura, não altera nada)
-- ------------------------------------------------------------
-- Compara o que o profile diz com o que o histórico prova. As duas primeiras
-- colunas devem bater entre si; a terceira é o valor corrompido.
--
-- `mission_completions.credited_xp` já é o XP PÓS-teto diário — é o que foi
-- efetivamente creditado. Não somar `xp_snapshot` nem `original_xp`.
select
  p.id,
  p.nickname,
  p.total_xp                                   as no_profile_hoje,
  coalesce(c.total, 0)                         as por_completions,
  coalesce(e.total, 0)                         as por_xp_events,
  public.xp_level_from_total(coalesce(c.total, 0)) as level_esperado,
  coalesce(c.total, 0) - p.total_xp            as xp_a_recuperar
from public.profiles p
left join (
  select user_id, sum(credited_xp)::int as total
    from public.mission_completions
   where reverted_at is null
   group by user_id
) c on c.user_id = p.id
left join (
  -- xp_events já é líquido: as reversões entram como valores negativos
  select user_id, sum(amount)::int as total
    from public.xp_events
   group by user_id
) e on e.user_id = p.id
where coalesce(c.total, 0) <> p.total_xp
order by xp_a_recuperar desc;

-- Se `por_completions` e `por_xp_events` DIVERGIREM para alguém, pare e
-- investigue com supabase/2026-xp-audit.sql antes de escrever qualquer coisa.
--
-- ATENÇÃO à margem de erro: missões com status 'done' anteriores à migração de
-- mission_completions não têm linha lá e NÃO entram na soma. Para esses casos
-- o valor reconstruído é um PISO, não o número exato.


-- ------------------------------------------------------------
-- PARTE 2 — RECUPERAÇÃO (escreve)
-- ------------------------------------------------------------
-- Reconstrói total_xp e level a partir das conclusões ativas. Só toca em quem
-- está com o total ABAIXO do que o histórico prova — nunca reduz o de ninguém.
update public.profiles p
   set total_xp = v.total,
       level    = public.xp_level_from_total(v.total)
  from (
    select user_id, sum(credited_xp)::int as total
      from public.mission_completions
     where reverted_at is null
     group by user_id
  ) v
 where p.id = v.user_id
   and p.total_xp < v.total;

-- Realinha os orçamentos de hoje e de ontem com as conclusões reais. Sem isto,
-- um daily_xp zerado deixaria o usuário ganhar acima do teto de 300 hoje.
update public.profiles p set
  daily_xp = coalesce((
    select sum(credited_xp) from public.mission_completions
     where user_id = p.id and reverted_at is null
       and completed_for_date = (now() at time zone 'America/Sao_Paulo')::date
  ), 0),
  daily_xp_date = (now() at time zone 'America/Sao_Paulo')::date,
  yesterday_xp = coalesce((
    select sum(credited_xp) from public.mission_completions
     where user_id = p.id and reverted_at is null
       and completed_for_date = (now() at time zone 'America/Sao_Paulo')::date - 1
  ), 0),
  yesterday_xp_date = (now() at time zone 'America/Sao_Paulo')::date - 1;

-- Confira o resultado rodando a PARTE 1 de novo: ela deve voltar vazia.


-- ------------------------------------------------------------
-- PARTE 3 — BLINDAGEM (opcional, mas é o que impede o bug de voltar)
-- ------------------------------------------------------------
-- A policy de UPDATE de profiles é `using (auth.uid() = id)` SEM restrição de
-- coluna — e RLS não restringe coluna, só linha. Hoje qualquer código do
-- cliente (ou um PATCH manual no PostgREST) pode gravar total_xp, level,
-- current_streak e crystals. Foi por essa porta que a zeragem passou.
--
-- A ferramenta certa é GRANT por coluna: o cliente só escreve identidade e
-- aparência; XP, streak e cristais passam a ser exclusivos das RPCs
-- (security definer, que ignoram grants do chamador).
--
-- ANTES DE RODAR, saiba o que muda:
--   * persistStats e persistStreak (AppStateProvider) passarão a falhar — os
--     dois já têm .catch, então o app não quebra.
--   * Isso é o objetivo: complete_mission_atomic já grava total_xp, level,
--     daily_xp, current_streak, best_streak e last_mission_completed_at.
--   * O orçamento do dia se auto-cura: a RPC recalcula o usado a partir de
--     mission_completions, não de profiles.daily_xp.
--   * A migração de virada de dia deixa de persistir. Teste esse caminho antes
--     de considerar concluído.
--
-- Descomente para aplicar:

-- revoke update on public.profiles from authenticated;
-- grant update (
--   name, nickname, tag, avatar_url,
--   character_class, character_skin, character_background
-- ) on public.profiles to authenticated;

-- ------------------------------------------------------------
notify pgrst, 'reload schema';
