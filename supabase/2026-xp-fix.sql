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
-- ⚠️ NÃO DESCOMENTE AINDA. Uma revisão adversarial encontrou três armadilhas
-- nesta parte; elas estão resolvidas no texto abaixo, mas a mudança precisa de
-- um teste em staging antes de ir para produção. Detalhes:
--
-- (1) O GRANT PRECISA INCLUIR `id`.
--     updateMyProfile usa .upsert({ id, ...patch }) (src/lib/db/profiles.ts:34).
--     O PostgREST traduz upsert em INSERT ... ON CONFLICT (id) DO UPDATE SET,
--     e a coluna do conflito entra na lista do SET — então o comando exige
--     privilégio de UPDATE em `id`. Sem ele, TODA escrita falha com 42501,
--     inclusive nickname e classe. O onboarding trava: o usuário novo nunca
--     passa do ClassGuard, porque escolher a classe deixa de gravar.
--     Conceder update(id) é inócuo: a policy profiles_update_own não declara
--     WITH CHECK, então o USING (auth.uid() = id) também vale na escrita e
--     ninguém consegue reatribuir o próprio id.
--
-- (2) O XP TEM UM SEGUNDO CAMINHO DE ESCRITA.
--     Bloquear profiles não fecha xp_events: existe policy de INSERT para o
--     cliente e o trigger apply_xp_event() soma em profiles.year_xp (o ranking
--     anual). O revoke abaixo fecha isso. logXpEvent (src/lib/db/xpEvents.ts)
--     não tem nenhum chamador, então nada do app quebra.
--
-- (3) O RESET DE CONTA (dev) PASSA A FALHAR EM SILÊNCIO.
--     resetAccount.ts:86 faz .update(...) direto em profiles e não checa erro.
--     Com a blindagem, o reset vira um no-op silencioso: a UI diz que resetou
--     e nada acontece. Antes de aplicar, ou mova o reset para uma RPC security
--     definer, ou faça-o checar o erro e falhar visivelmente.
--
-- O QUE MAIS MUDA (esperado e desejado):
--   * persistStats e persistStreak passam a falhar — os dois já têm .catch.
--     É o objetivo: complete_mission_atomic já grava total_xp, level, daily_xp,
--     current_streak, best_streak e last_mission_completed_at.
--   * O orçamento do dia se auto-cura: a RPC calcula o usado a partir de
--     mission_completions, não de profiles.daily_xp.
--   * A migração de virada de dia deixa de persistir. Teste esse caminho.
--   * last_xp_loss_check_date fica não-gravável — lembre-se disto se um dia
--     religar a perda por inatividade.
--
-- COMO TESTAR EM STAGING ANTES: com a blindagem aplicada, faça um cadastro
-- novo e vá até o fim do onboarding (nickname + classe). Se travar, o `id`
-- não foi concedido.
--
-- Descomente para aplicar:

-- revoke update on public.profiles from authenticated;
-- grant update (
--   id,
--   name, nickname, tag, avatar_url,
--   character_class, character_skin, character_background
-- ) on public.profiles to authenticated;

-- fecha o caminho paralelo: xp_events → trigger → profiles.year_xp
-- revoke insert, delete on public.xp_events from authenticated;

-- ------------------------------------------------------------
notify pgrst, 'reload schema';
