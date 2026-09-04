-- ===========================================================================
-- ESPELHO DA ABA MÉTRICAS  —  lvl2do
--
-- COMO USAR
--   1. Abra o SQL Editor do Supabase (menu da esquerda, ícone </>).
--   2. Cole ESTE ARQUIVO INTEIRO, do primeiro "--" até o fim.
--   3. Clique em RUN.
--   4. Mande UMA FOTO da tabela que aparecer. A última linha, "  >>> VEREDITO <<< ",
--      já diz em português o que está acontecendo.
--
-- É SÓ LEITURA. Não altera, não apaga e não cria nada.
--
-- É UMA consulta só, de propósito: o SQL Editor do Supabase mostra apenas o
-- resultado da ÚLTIMA consulta do arquivo. Arquivo com duas consultas esconde a
-- primeira — foi o que aconteceu antes.
--
-- O QUE ELA FAZ
--   Refaz, em SQL, exatamente a mesma matemática que a tela faz em
--   src/hooks/useMetrics.ts, e ainda confere três coisas que a tela não mostra:
--     (a) o schema real da tabela xp_events (colunas e tipos);
--     (b) o FORMATO do texto que o navegador recebe em happened_on;
--     (c) se a RLS está ligada e se existe policy de SELECT.
--   Se o número daqui bater com o número da tela, o app está certo e o assunto
--   é o dado. Se divergir, o bug é no app — e o veredito diz qual.
-- ===========================================================================
with

-- (1) QUANDO É "HOJE" -------------------------------------------------------
-- happened_on guarda o dia LOCAL do usuário. A RPC grava
--   (now() at time zone 'America/Sao_Paulo')::date
-- (supabase/2026-mission-completions.sql:110), então "hoje" aqui usa o mesmo
-- fuso. NÃO use current_date: no Supabase ele é UTC e, depois das 21h, já virou
-- o dia seguinte — o que sozinho deslocaria todas as janelas em um dia.
hoje as (
  select (now() at time zone 'America/Sao_Paulo')::date as d
),

-- (2) QUEM ------------------------------------------------------------------
-- No SQL Editor você roda como dono do banco: auth.uid() é NULL e não dá para
-- filtrar pela sessão do app. Então pegamos a conta com MAIS eventos, e logo
-- abaixo mostramos o E-MAIL dela — é assim que você confere, sem DevTools, se
-- os eventos são mesmo da conta com que você entra no app.
alvo as (
  select user_id
  from public.xp_events
  group by user_id
  order by count(*) desc, user_id
  limit 1
),

contas as (
  select coalesce(string_agg(
           coalesce(u.email, t.user_id::text) || ' → ' || t.n::text || ' evento(s)',
           '   |   ' order by t.n desc), '—') as txt
  from (select user_id, count(*) as n from public.xp_events group by 1) t
  left join auth.users u on u.id = t.user_id
),

-- (3) O SCHEMA REAL DA TABELA ------------------------------------------------
-- Encerra de vez a discussão sobre quais colunas existem e de que tipo são.
-- happened_on TEM que ser "date". Se for text ou timestamp, veja o bloco (4).
colunas as (
  select
    coalesce(string_agg(column_name || ' ' || data_type, ',  ' order by ordinal_position),
             '(a tabela public.xp_events NÃO EXISTE)')                                  as txt,
    coalesce(max(data_type) filter (where column_name = 'happened_on'), '(NÃO EXISTE)')  as tipo_ho,
    count(*) filter (where column_name in ('created_at', 'kind', 'category'))::int       as legado
  from information_schema.columns
  where table_schema = 'public' and table_name = 'xp_events'
),

-- (4) O FORMATO EXATO QUE O NAVEGADOR RECEBE ---------------------------------
-- to_jsonb(x) #>> '{}' devolve o texto EXATAMENTE como o PostgREST serializa a
-- coluna para o navegador. Isto é o único jeito de enxergar este defeito:
--   o app NÃO faz new Date(happened_on). Ele faz happened_on.split("-")
--   (src/lib/xp-system.ts:68-71). Se o valor chegar como
--   "2026-09-01T00:00:00+00:00" em vez de "2026-09-01", Number("01T00:00:00...")
--   vira NaN, o diff vira NaN, "NaN >= 0" é falso e as janelas Semanal e Mensal
--   descartam TODOS os eventos — três zeros e gráfico chapado. O Anual
--   sobreviveria, porque só lê os dois primeiros pedaços da string.
-- Um "::date" aqui destruiria essa evidência: ele arruma a string em silêncio.
raw as (
  select to_jsonb(e.happened_on) #>> '{}' as txt_ho,
         e.amount                          as amount,
         e.reason                          as reason
  from public.xp_events e
  where e.user_id = (select user_id from alvo)
),

formato as (
  select
    coalesce(string_agg(t.amostra || '  (' || t.len::text || ' chars) × ' || t.q::text,
                        '   |   ' order by t.q desc), '—')      as txt,
    coalesce(max(t.len) filter (where t.amostra <> '(NULO)'), 0)::int as len_max,
    coalesce(min(t.len) filter (where t.amostra <> '(NULO)'), 10)::int as len_min
  from (
    select coalesce(left(raw.txt_ho, 32), '(NULO)') as amostra,
           coalesce(length(raw.txt_ho), 0)          as len,
           count(*)                                 as q
    from raw
    group by 1, 2
  ) t
),

-- (5) OS EVENTOS COMO O APP OS ENXERGA ---------------------------------------
-- dia sai do TEXTO (os 10 primeiros caracteres), igual ao app, e com uma guarda
-- de formato para a consulta nunca estourar caso a coluna guarde lixo.
-- diff = hoje - dia  →  é o mesmo daysBetweenDateKeys(dia, hoje) do app:
-- evento no passado dá diff POSITIVO.
ev as (
  select 1                                                     as one,
         (raw.txt_ho is null)                                  as sem_dia,
         case when raw.txt_ho ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
              then substring(raw.txt_ho from 1 for 10)::date
         end                                                   as dia,
         case when raw.txt_ho ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
              then h.d - substring(raw.txt_ho from 1 for 10)::date
         end                                                   as diff,
         coalesce(raw.amount, 0)::int                          as amount,
         raw.reason                                            as reason
  from hoje h
  cross join raw
),

-- (6) AS TRÊS JANELAS --------------------------------------------------------
--   Semanal : diff de 0 a 6    (useMetrics.ts:75-78)
--   Mensal  : diff de 0 a 27   (useMetrics.ts:85-88)
--   Anual   : mês do evento dentro dos últimos 12 meses (useMetrics.ts:100-111)
-- "XP no período"      = soma de amount, com piso em 0   → Math.max(0, …)
-- "Missões concluídas" = nº de eventos com reason = 'mission_done', string exata
-- O left join garante UMA linha de resultado mesmo sem nenhum evento.
jan as (
  select
    count(ev.one)::int                                as n_eventos,
    (count(*) filter (where ev.sem_dia))::int         as n_sem_dia,
    (count(*) filter (where ev.one is not null and ev.dia is null and not ev.sem_dia))::int as n_ilegivel,
    min(ev.dia)                                       as primeiro,
    max(ev.dia)                                       as ultimo,
    max(ev.diff)                                      as diff_max,
    min(ev.diff)                                      as diff_min,
    (count(*) filter (where ev.diff < 0))::int        as n_futuro,

    greatest(0, coalesce(sum(ev.amount) filter (where ev.diff between 0 and 6), 0))::int   as xp_sem,
    (count(*) filter (where ev.diff between 0 and 6
                        and ev.reason = 'mission_done'))::int                              as mis_sem,

    greatest(0, coalesce(sum(ev.amount) filter (where ev.diff between 0 and 27), 0))::int  as xp_men,
    (count(*) filter (where ev.diff between 0 and 27
                        and ev.reason = 'mission_done'))::int                              as mis_men,

    greatest(0, coalesce(sum(ev.amount) filter (
      where date_trunc('month', ev.dia::timestamp)
            between date_trunc('month', (select d from hoje)::timestamp) - interval '11 months'
                and date_trunc('month', (select d from hoje)::timestamp)), 0))::int        as xp_ano,
    (count(*) filter (
      where date_trunc('month', ev.dia::timestamp)
            between date_trunc('month', (select d from hoje)::timestamp) - interval '11 months'
                and date_trunc('month', (select d from hoje)::timestamp)
        and ev.reason = 'mission_done'))::int                                              as mis_ano,

    greatest(0, coalesce(sum(ev.amount), 0))::int                          as xp_tudo,
    coalesce(sum(ev.amount), 0)::int                                       as xp_liquido,
    (count(*) filter (where ev.reason = 'mission_done'))::int              as mis_tudo,
    (count(*) filter (where ev.reason = 'mission_reverted'))::int          as rev_tudo
  from hoje h
  left join ev on true
),

-- (7) QUAIS "reason" EXISTEM DE FATO -----------------------------------------
-- O app conta missão comparando reason = 'mission_done', string EXATA. Se aqui
-- aparecer outra grafia (ou "(NULO)"), o XP soma e as missões ficam em 0.
motivos as (
  select coalesce(string_agg(t.reason || ' × ' || t.q::text, '   |   ' order by t.q desc), '—') as txt
  from (select coalesce(raw.reason, '(NULO)') as reason, count(*) as q from raw group by 1) t
),

-- (8) A RLS ESTÁ LIGADA? EXISTE POLICY DE SELECT? ----------------------------
-- Isto é o que NENHUMA verificação anterior conseguiu ver: o SQL Editor roda
-- como dono da tabela e IGNORA RLS. Se a RLS estiver ligada e não houver policy
-- de SELECT, o navegador recebe HTTP 200 com lista VAZIA — sem erro, sem banner
-- vermelho, e a tela mostra exatamente três zeros. GRANT não cobre isso:
-- grant e policy são coisas diferentes.
rls as (
  select coalesce(bool_or(c.relrowsecurity), false) as ligada
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'xp_events'
),

policies as (
  select
    coalesce(string_agg(p.policyname || ' [' || p.cmd || ']', '   |   ' order by p.policyname), '(NENHUMA)') as txt,
    (count(*) filter (where p.cmd in ('SELECT', 'ALL')))::int as n_select
  from pg_policies p
  where p.schemaname = 'public' and p.tablename = 'xp_events'
),

-- (9) GRÁFICO SEMANAL, DIA A DIA ---------------------------------------------
-- Os 7 dias de hoje-6 até hoje, com o XP somado de cada um. É a mesma série que
-- o gráfico da aba Semanal desenha. Dia sem evento aparece como 0.
serie as (
  select g.i                                                    as i,
         (h.d - (6 - g.i))                                      as dia,
         coalesce(sum(e.amount), 0)::int                        as xp,
         (count(*) filter (where e.reason = 'mission_done'))::int as mis
  from hoje h
  cross join generate_series(0, 6) as g(i)
  left join ev e on e.dia = h.d - (6 - g.i)
  group by g.i, h.d
),

-- (10) GRÁFICO MENSAL — as 4 barras S1..S4 (idx = 3 - floor(diff/7)) ---------
baldes as (
  select 3 - (ev.diff / 7) as idx, sum(ev.amount)::int as xp
  from ev
  where ev.diff between 0 and 27
  group by 1
),
mensal_txt as (
  select coalesce(string_agg('S' || (g.i + 1)::text || ': ' || coalesce(b.xp, 0)::text || ' XP',
                             '   |   ' order by g.i), '—') as txt
  from generate_series(0, 3) as g(i)
  left join baldes b on b.idx = g.i
),

-- (11) GRÁFICO ANUAL — os 12 meses -------------------------------------------
meses as (
  select g.i as i,
         (date_trunc('month', (select d from hoje)::timestamp)
          - make_interval(months => 11 - g.i))::date as m1
  from generate_series(0, 11) as g(i)
),
anual_txt as (
  select coalesce(string_agg(
    (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from m.m1)::int]
      || '/' || to_char(m.m1, 'YY') || ': ' || coalesce(x.xp, 0)::text || ' XP',
    '   |   ' order by m.i), '—') as txt
  from meses m
  left join (
    select date_trunc('month', ev.dia::timestamp)::date as m1, sum(ev.amount)::int as xp
    from ev where ev.dia is not null group by 1
  ) x on x.m1 = m.m1
)

-- (12) SAÍDA — uma linha por número, para caber numa foto --------------------
select bloco as "bloco", item as "o que é", valor as "valor"
from (
  select 1 as ord, 'CONTA' as bloco,
         'e-mail da conta analisada   << É ESTE QUE VOCÊ USA NO APP?' as item,
         coalesce((select u.email from auth.users u where u.id = (select user_id from alvo)),
                  '>>> a tabela xp_events está VAZIA <<<') as valor
  union all select  2, 'CONTA', 'user_id analisado',
         coalesce((select user_id::text from alvo), '—')
  union all select  3, 'CONTA', 'todas as contas que têm eventos',
         (select txt from contas)
  union all select  4, 'CONTA', 'hoje (America/Sao_Paulo)',
         (select d::text from hoje)

  union all select 10, 'SCHEMA REAL', 'colunas de public.xp_events',
         (select txt from colunas)
  union all select 11, 'SCHEMA REAL', 'tipo de happened_on   (tem que ser "date")',
         (select tipo_ho from colunas)
  union all select 12, 'SCHEMA REAL', 'como happened_on chega no navegador   (tem que ter 10 chars)',
         (select txt from formato)
  union all select 13, 'SCHEMA REAL', 'eventos com happened_on NULO   (quebram a página)',
         (select n_sem_dia::text from jan)
  union all select 14, 'SCHEMA REAL', 'eventos com data ilegível',
         (select n_ilegivel::text from jan)
  union all select 15, 'SCHEMA REAL', 'valores de reason encontrados',
         (select txt from motivos)

  union all select 16, 'ACESSO (RLS)', 'RLS ligada em xp_events?',
         (select case when ligada then 'SIM' else 'NÃO' end from rls)
  union all select 17, 'ACESSO (RLS)', 'policies existentes',
         (select txt from policies)
  union all select 18, 'ACESSO (RLS)', 'policies que permitem SELECT   (precisa ser >= 1)',
         (select n_select::text from policies)

  union all select 20, 'DADOS', 'eventos desta conta (o app recebe no máx. 1000, os mais antigos)',
         (select n_eventos::text from jan)
  union all select 21, 'DADOS', 'primeiro e último happened_on',
         (select coalesce(primeiro::text, '—') || '   →   ' || coalesce(ultimo::text, '—') from jan)
  union all select 22, 'DADOS', 'o evento mais recente foi há quantos dias',
         (select case when diff_min is null then '—'
                      when diff_min < 0 then 'está NO FUTURO, daqui a ' || (-diff_min)::text || ' dia(s)'
                      else diff_min::text || ' dia(s)' end from jan)
  union all select 23, 'DADOS', 'eventos com data NO FUTURO (Semanal/Mensal ignoram, Anual conta)',
         (select n_futuro::text from jan)

  union all select 30, 'SEMANAL (7 dias)', 'XP no período',      (select xp_sem::text from jan)
  union all select 31, 'SEMANAL (7 dias)', 'Missões concluídas', (select mis_sem::text from jan)

  union all select 40, 'MENSAL (28 dias)', 'XP no período',      (select xp_men::text from jan)
  union all select 41, 'MENSAL (28 dias)', 'Missões concluídas', (select mis_men::text from jan)
  union all select 42, 'MENSAL (28 dias)', 'gráfico (4 barras)', (select txt from mensal_txt)

  union all select 50, 'ANUAL (12 meses)', 'XP no período',      (select xp_ano::text from jan)
  union all select 51, 'ANUAL (12 meses)', 'Missões concluídas', (select mis_ano::text from jan)
  union all select 52, 'ANUAL (12 meses)', 'gráfico (12 meses)', (select txt from anual_txt)

  union all
  select 60 + s.i, 'GRÁFICO SEMANAL (o que a tela desenha)',
         to_char(s.dia, 'DD/MM') || '  ' ||
         (array['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'])[extract(dow from s.dia)::int + 1] ||
         case when s.dia = (select d from hoje) then '   (hoje)' else '' end,
         s.xp::text || ' XP' ||
         case when s.mis > 0 then '   ·   ' || s.mis::text || ' missão(ões)' else '' end
  from serie s

  union all select 80, 'TODOS OS TEMPOS', 'XP líquido (ganhos menos reversões)',
         (select xp_liquido::text from jan)
  union all select 81, 'TODOS OS TEMPOS', 'eventos mission_done',
         (select mis_tudo::text from jan)
  union all select 82, 'TODOS OS TEMPOS', 'eventos mission_reverted',
         (select rev_tudo::text from jan)

  union all
  select 99, '  >>> VEREDITO <<< ', 'leia esta linha primeiro',
    case
      -- ordem importa: primeiro o que impede a leitura, depois o que a explica.
      when (select tipo_ho from colunas) = '(NÃO EXISTE)' then
        'A coluna happened_on NÃO EXISTE nesta tabela. A leitura das métricas falha. '
        || 'Veja a linha "colunas de public.xp_events" para o schema real.'
      when (select n_eventos from jan) = 0 then
        'A tabela xp_events não tem NENHUM evento nesta conta. A tela mostrar 0 está CORRETO — '
        || 'não existe histórico para mostrar. Confira a linha 3: se OUTRA conta tem eventos, '
        || 'você está logado no app com a conta errada. Se ninguém tem, o histórico precisa ser '
        || 'reconstruído a partir de mission_completions.'
      when (select ligada from rls) and (select n_select from policies) = 0 then
        'ACHOU: a RLS está LIGADA e NÃO existe policy de SELECT em xp_events. O navegador recebe '
        || 'uma lista VAZIA, com sucesso e sem erro — por isso não aparece banner nenhum e a tela '
        || 'mostra três zeros. Aqui no SQL Editor você roda como dono e a RLS é ignorada, por isso '
        || 'os números acima existem. Correção: create policy "xp_events_select_own" on '
        || 'public.xp_events for select using (auth.uid() = user_id);'
      when (select n_sem_dia from jan) > 0 then
        'DEFEITO NOS DADOS: ' || (select n_sem_dia::text from jan) || ' evento(s) com happened_on '
        || 'NULO. O app faz .split("-") nesse valor e a página quebra ao montar as métricas. '
        || 'Corrigir ou apagar esses eventos.'
      when (select tipo_ho from colunas) <> 'date'
        or (select len_max from formato) <> 10
        or (select len_min from formato) <> 10 then
        'DEFEITO NO APP (não é janela de tempo): happened_on NÃO chega como "YYYY-MM-DD" de 10 '
        || 'caracteres — veja a linha 12. O app usa essa string crua e daysBetweenDateKeys() vira '
        || 'NaN, então Semanal e Mensal descartam TODOS os eventos e o gráfico fica chapado. '
        || 'Correção: a coluna vira date, OU dayKeyOf() em src/hooks/useMetrics.ts:30 passa a '
        || 'fazer String(e.happened_on).slice(0,10).'
      when (select n_eventos from jan) > 0 and (select mis_tudo from jan) = 0 then
        'ACHOU METADE: NENHUM dos seus ' || (select n_eventos::text from jan) || ' eventos tem '
        || 'reason = ''mission_done'' (veja a linha 15). O app compara essa string EXATA, então '
        || '"Missões concluídas" fica em 0 em TODAS as abas, mesmo havendo XP. São eventos '
        || 'legados, anteriores à RPC. Quanto ao XP: a aba Semanal deveria mostrar '
        || (select xp_sem::text from jan) || ' XP.'
      when (select xp_sem from jan) > 0 or (select mis_sem from jan) > 0 then
        'OS EVENTOS ESTÃO DENTRO DA JANELA: a aba Semanal DEVERIA mostrar '
        || (select xp_sem::text from jan) || ' XP e ' || (select mis_sem::text from jan)
        || ' missões. Se a tela mostra 0, o dado não está chegando ao navegador — NÃO é a janela '
        || 'de datas. Confira o e-mail da linha 1: se não for o e-mail com que você entra no app, '
        || 'os eventos são de outra conta.'
      when (select mis_men from jan) > 0 and (select xp_men from jan) = 0 then
        'NÃO É JANELA DE TEMPO: dentro dos últimos 28 dias você tem '
        || (select mis_men::text from jan) || ' conclusão(ões), mas o XP líquido do período é 0 ou '
        || 'negativo (há ' || (select rev_tudo::text from jan) || ' reversão(ões)). O card "XP no '
        || 'período" tem piso 0, então mostra 0 mesmo havendo eventos.'
      when (select xp_men from jan) > 0 then
        'NÃO HÁ BUG. Seu evento mais recente é de ' || (select ultimo::text from jan) || ', '
        || (select diff_min::text from jan) || ' dias atrás — fora dos últimos 7 dias, então a aba '
        || 'Semanal mostrar 0 está MATEMATICAMENTE CORRETO. CLIQUE EM "MENSAL" na própria tela: '
        || 'lá tem ' || (select xp_men::text from jan) || ' XP e ' || (select mis_men::text from jan)
        || ' missões.'
      when (select xp_ano from jan) > 0 then
        'NÃO HÁ BUG na Semanal nem na Mensal. Evento mais recente: ' || (select ultimo::text from jan)
        || ' (' || (select diff_min::text from jan) || ' dias atrás), fora das duas janelas. '
        || 'CLIQUE EM "ANUAL": lá tem ' || (select xp_ano::text from jan) || ' XP e '
        || (select mis_ano::text from jan) || ' missões.'
      when (select mis_tudo from jan) > 0 and (select xp_liquido from jan) <= 0 then
        'Você tem ' || (select mis_tudo::text from jan) || ' conclusões e '
        || (select rev_tudo::text from jan) || ' reversões, e o XP líquido é '
        || (select xp_liquido::text from jan) || '. O card "XP no período" tem piso 0, então mostra '
        || '0 mesmo havendo eventos. Não é bug de janela: é o saldo que está zerado/negativo.'
      else
        'Você tem ' || (select n_eventos::text from jan) || ' evento(s), mas TODOS têm mais de 12 '
        || 'meses. As três abas mostrarem 0 está CORRETO.'
    end
) r
order by ord;

-- ===========================================================================
-- SE O RESULTADO FOR X, SIGNIFICA Y
-- ---------------------------------------------------------------------------
--
-- 1) "a tabela xp_events está VAZIA" / eventos desta conta = 0
--    → Não existe histórico. A tela mostrar 0 está CORRETO.
--      Se a linha 3 mostrar OUTRO e-mail com eventos, você está logado no app
--      com a conta errada. Se ninguém tem eventos, o histórico tem de ser
--      reconstruído a partir de mission_completions.
--
-- 2) O e-mail da linha 1 NÃO é o seu
--    → Os 31 eventos são de outra conta. A RLS devolve lista vazia para a conta
--      logada, sem erro nenhum, e a tela fica em 0. Não é bug: é identidade.
--
-- 3) "RLS ligada = SIM" e "policies que permitem SELECT = 0"
--    → ESTA é a causa. O navegador recebe HTTP 200 com [] — sucesso, lista
--      vazia, nenhum banner de erro, três zeros na tela. Aqui no SQL Editor
--      você roda como dono e a RLS é ignorada, por isso os números acima
--      aparecem normalmente. A correção vem escrita na própria linha do
--      veredito:  create policy "xp_events_select_own" on public.xp_events
--                 for select using (auth.uid() = user_id);
--      Atenção: GRANT e POLICY são coisas diferentes. O grant já foi conferido
--      e está certo; policy é outra camada.
--
-- 4) "tipo de happened_on" ≠ date, ou a linha 12 mostra algo com mais de 10
--    caracteres (ex.: "2026-09-01T00:00:00+00:00")
--    → Bug no app, e não janela de tempo. O app lê a string crua e faz
--      split("-"); com esse formato o cálculo de dias vira NaN e Semanal e
--      Mensal descartam TODOS os eventos. Correção: coluna vira date, ou
--      dayKeyOf() passa a fazer String(e.happened_on).slice(0,10).
--
-- 5) "eventos com happened_on NULO" > 0
--    → Esses eventos quebram a montagem das métricas (split de null). Corrigir
--      ou apagar as linhas.
--
-- 6) "valores de reason" sem 'mission_done' (ex.: gain, mission_complete)
--    → O XP aparece mas "missões concluídas" fica em 0: o app compara a string
--      exata 'mission_done'. São eventos legados, anteriores à RPC.
--
-- 7) SEMANAL aqui > 0 e a tela continua "0 XP / 0 missões"
--    → Os eventos existem E caem na janela: o problema é entrega, não data.
--      Nesta ordem: e-mail da linha 1 (conta errada) → RLS/policy (item 3) →
--      sessão expirada.
--
-- 8) SEMANAL aqui = 0, MENSAL aqui > 0
--    → NÃO HÁ BUG NENHUM. Seus eventos são de 7 a 27 dias atrás; a janela
--      Semanal (hoje-6 até hoje) está legitimamente vazia. Clique em "Mensal"
--      na tela e os números aparecem. É a hipótese mais provável hoje:
--      04/09/2026 é sexta, e a semana de eventos que você viu terminava numa
--      sexta — a anterior, 28/08, que está a 7 dias, fora por UM dia.
--
-- 9) SEMANAL e MENSAL = 0, ANUAL > 0
--    → Também correto. Clique em "Anual".
--
-- 10) As três janelas = 0 e "XP líquido" <= 0 com mission_done > 0
--    → Não é janela: as reversões cancelaram os ganhos, e o card tem piso 0.
--
-- 11) "eventos com data NO FUTURO" > 0
--    → happened_on adiantado. Semanal e Mensal ignoram (exigem diff >= 0) e o
--      Anual conta — a tela fica inconsistente entre as abas.
--
-- 12) "eventos desta conta" > 1000
--    → getXpEvents (src/lib/db/xpEvents.ts:45-51) não tem .limit() e ordena por
--      happened_at CRESCENTE. Acima do teto padrão do PostgREST o navegador
--      recebe os 1000 MAIS ANTIGOS e a janela recente fica vazia. Com 31
--      eventos isso não acontece — mas se um dia acontecer, o sintoma é
--      exatamente este.
--
-- 13) Todos os números daqui BATEM com a tela
--    → O app está correto. O que resta é expectativa: a janela escolhida está
--      vazia. Vale mostrar "sem atividade nos últimos 7 dias" na UI em vez de
--      um zero mudo.
--
-- ---------------------------------------------------------------------------
-- Para fixar uma conta específica em vez de "a que tem mais eventos", troque o
-- bloco `alvo` por:
--     alvo as ( select 'cole-aqui-o-uuid'::uuid as user_id )
-- ===========================================================================
