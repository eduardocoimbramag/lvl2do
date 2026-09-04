-- ============================================================
-- DIAGNÓSTICO — aba Métricas mostrando 0 XP, 0 missões e gráfico vazio
--
-- COMO USAR: cole este arquivo inteiro no SQL Editor do Supabase e clique
-- em Run. Ele NÃO altera nada — são só consultas de leitura.
--
-- Depois me mande o resultado das 4 consultas.
-- ============================================================

-- Seu usuário. Se um dia precisar rodar para outra conta, troque aqui.
-- (No SQL Editor não dá para usar auth.uid(), porque ele roda como admin.)


-- ------------------------------------------------------------
-- 1) Existem eventos de XP para você? E de quando são?
-- ------------------------------------------------------------
-- Esta é a tabela que alimenta "XP no período", "Missões concluídas" e o
-- gráfico. Se vier VAZIA, o problema é que não há histórico — e a correção
-- é reconstruí-lo. Se vier com linhas, olhe a coluna happened_on: o gráfico
-- semanal só mostra os últimos 7 dias.
select
  id,
  amount,
  reason,
  happened_on,
  happened_at
from public.xp_events
where user_id = 'b0411a85-faaa-42f9-843f-df3dc4f01852'
order by happened_at desc;


-- ------------------------------------------------------------
-- 2) Resumo: quantos eventos, de que período, somando quanto
-- ------------------------------------------------------------
-- Um resumo em uma linha só, para comparar com o que a tela mostra.
select
  count(*)                                  as qtd_eventos,
  coalesce(sum(amount), 0)                  as xp_total,
  min(happened_on)                          as evento_mais_antigo,
  max(happened_on)                          as evento_mais_recente,
  count(*) filter (
    where happened_on >= current_date - 6
  )                                         as eventos_nos_ultimos_7_dias
from public.xp_events
where user_id = 'b0411a85-faaa-42f9-843f-df3dc4f01852';


-- ------------------------------------------------------------
-- 3) O app tem permissão para LER essa tabela?
-- ------------------------------------------------------------
-- Comparo xp_events com missions, que comprovadamente funciona no app.
-- O que importa é a comparação: se `missions` aparecer com SELECT para
-- `authenticated` e `xp_events` NÃO aparecer, é falta de permissão.
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('xp_events', 'missions', 'mission_completions')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;


-- ------------------------------------------------------------
-- 4) O histórico de conclusões está intacto?
-- ------------------------------------------------------------
-- Esta é a outra fonte de verdade. Se ela tiver linhas e a consulta 1 vier
-- vazia, dá para reconstruir os eventos a partir daqui.
select
  count(*)                                  as qtd_conclusoes,
  coalesce(sum(credited_xp), 0)             as xp_total,
  min(completed_for_date)                   as mais_antiga,
  max(completed_for_date)                   as mais_recente,
  count(*) filter (
    where completed_for_date >= current_date - 6
  )                                         as conclusoes_nos_ultimos_7_dias
from public.mission_completions
where user_id = 'b0411a85-faaa-42f9-843f-df3dc4f01852'
  and reverted_at is null;
