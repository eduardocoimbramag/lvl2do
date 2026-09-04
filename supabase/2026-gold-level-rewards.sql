-- ============================================================
-- lvl2do — MOEDA DE OURO: +50 a cada nível ganho
-- ============================================================
-- Regra de produto: toda vez que o usuário SOBE de nível, ganha 50 moedas
-- de ouro. O saldo aparece no rodapé da sidebar (CurrencyBalance.tsx), ao
-- lado dos cristais.
--
-- O PROBLEMA QUE ESTE ARQUIVO EXISTE PARA RESOLVER — FARM DE OURO.
-- Conclusão e reversão de missão são livres (complete_mission_atomic /
-- revert_mission_atomic). Se o crédito fosse "ganhou nível → +50" e a
-- reversão não tirasse nada, bastava concluir e reverter a MESMA missão em
-- cima de uma fronteira de nível para imprimir ouro infinito.
--
-- A solução NÃO é tirar ouro na reversão (o ouro pode já ter sido gasto —
-- viraria saldo negativo, ou uma trava de gasto). A solução é a mesma que o
-- projeto já usa em boss_hits: um LEDGER com barreira física.
--   * public.level_rewards tem PK (user_id, level).
--   * Cada nível paga UMA vez na vida da conta. ON CONFLICT DO NOTHING.
--   * Descer de nível não apaga a linha; subir de novo não paga de novo.
-- Resultado: atravessar a fronteira do nível 8 mil vezes rende 50, não 50 mil.
--
-- POR QUE UM TRIGGER, E NÃO UMA EDIÇÃO DENTRO DA RPC ATÔMICA.
-- complete_mission_atomic é o caminho crítico do produto e já teve histórico
-- de incidente. Este arquivo NÃO a altera: o crédito entra por um trigger
-- BEFORE UPDATE em profiles, disparado por (new.level > old.level). Benefícios:
--   * diff ZERO na RPC atômica — nada de XP pode quebrar por causa do ouro;
--   * pega TODO caminho que sobe nível (RPC, recuperação manual, script);
--   * BEFORE UPDATE escreve em NEW.gold: sem UPDATE extra, sem recursão,
--     sem segundo lock de linha.
--
-- Rode no SQL Editor do Supabase. IDEMPOTENTE (pode rodar mais de uma vez).
-- Depende de: schema.sql (profiles) e 2026-mission-completions.sql.
-- A PARTE 4 (ouro retroativo) é OPCIONAL e está sinalizada.
-- ============================================================


-- ------------------------------------------------------------
-- 1) PROFILES.GOLD — saldo da moeda
-- ------------------------------------------------------------
-- Espelha crystals na forma e no tipo: integer not null default 0.
--   * integer  — mesma família de crystals/total_xp/year_xp e do `number` do
--                TS. Teto de 2,1 bi contra um máximo teórico de 49.900 por
--                conta (50 x 998 níveis). bigint só traria divergência.
--   * not null — `gold = gold + 50` com NULL devolve NULL e ZERA o saldo em
--                silêncio. É a mesma classe de bug da zeragem de XP. Fechada
--                aqui, no tipo.
--   * default 0 — conta nova nasce com saldo zero; handle_new_user não muda.
-- No PostgreSQL 11+ `add column not null default` é mudança de catálogo, sem
-- reescrita da tabela: instantâneo, sem lock relevante.
alter table public.profiles
  add column if not exists gold integer not null default 0;

-- Saldo não pode ser negativo. Mesmo argumento que 2026-character-background
-- escreveu para o fundo: a coluna é gravável por PATCH direto no PostgREST
-- (profiles_update_own não restringe coluna — RLS não restringe coluna), e um
-- futuro RPC de gasto pode esquecer o `if saldo < custo`. O CHECK é a última
-- linha. (Ele NÃO impede alguém escrever gold = 999999 — isso é grant, ver
-- PARTE 5.) Todas as linhas já satisfazem (default 0), a validação é trivial.
alter table public.profiles
  drop constraint if exists profiles_gold_nonnegative;
alter table public.profiles
  add constraint profiles_gold_nonnegative check (gold >= 0);

comment on column public.profiles.gold is
  'Saldo de moedas de ouro. Creditado SOMENTE pelo trigger profiles_award_level_gold (+50 por nível novo). Auditoria em public.level_rewards.';


-- ------------------------------------------------------------
-- 2) LEVEL_REWARDS — ledger de recompensa por nível (anti-farm)
-- ------------------------------------------------------------
-- Uma linha = um nível que JÁ FOI PAGO para aquele usuário. A PK é a barreira
-- física: (user_id, level) não repete nem com duas abas concluindo ao mesmo
-- tempo. É também o que torna o saldo RECONSTRUÍVEL — a lição de 2026-xp-fix,
-- onde total_xp só pôde ser recuperado porque mission_completions provava o
-- histórico. Moeda sem ledger não tem como ser recuperada depois.
create table if not exists public.level_rewards (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  /** nível ALCANÇADO que gerou o pagamento. Nunca 1: ninguém "upa" para o 1.
      Teto 999 = o mesmo clamp de public.xp_level_from_total. */
  level      integer not null check (level between 2 and 999),
  /** ouro pago por este nível. 50 hoje; guardado por linha para que uma
      mudança futura de valor não reescreva a história já paga. */
  gold       integer not null default 50 check (gold >= 0),
  /** 'level_up' = ganho no jogo · 'backfill' = crédito retroativo (PARTE 4). */
  reason     text    not null default 'level_up',
  awarded_at timestamptz not null default now(),
  primary key (user_id, level)
);

-- Retrofit defensivo (no-op em instalação nova): `create table if not exists`
-- não altera tabela existente.
alter table public.level_rewards
  add column if not exists reason text not null default 'level_up';

alter table public.level_rewards enable row level security;

-- Leitura própria apenas. TODA escrita passa pelo trigger security definer.
drop policy if exists "level_rewards_select_own" on public.level_rewards;
create policy "level_rewards_select_own" on public.level_rewards
  for select to authenticated using ((select auth.uid()) = user_id);

-- SEM policy de DELETE, de propósito — a mesma regra que boss_hits aprendeu
-- na v2: um ledger anti-abuso não pode ser apagável pelo auditado. Se o
-- usuário pudesse apagar a linha do nível 8, o farm voltaria inteiro.
-- CONSEQUÊNCIA CONHECIDA: o master reset de DEV (src/lib/db/resetAccount.ts)
-- não limpa esta tabela. Ele precisa passar a zerar `gold` junto com
-- `crystals`; reconquistar os níveis depois do reset não paga de novo (correto
-- — é exatamente a trava anti-farm funcionando). Se um dia o reset precisar
-- ser fiel de verdade, ele vira uma RPC security definer que limpa as duas.
revoke all on public.level_rewards from anon, authenticated;
grant select on public.level_rewards to authenticated;

comment on table public.level_rewards is
  'Ledger de ouro por nível. PK (user_id, level) = cada nível paga uma vez na vida da conta. É o que impede o farm concluir/reverter em cima da fronteira de nível.';


-- ------------------------------------------------------------
-- 3) TRIGGER — credita o ouro quando o nível sobe
-- ------------------------------------------------------------
-- BEFORE UPDATE em profiles, com WHEN (new.level > old.level):
--   * escreve direto em NEW.gold — nenhum UPDATE adicional, logo nenhuma
--     recursão de trigger e nenhum lock extra;
--   * o SELECT ... FOR UPDATE que complete_mission_atomic já faz no profile
--     serializa tudo por usuário; a PK do ledger é a garantia final;
--   * paga cada nível do intervalo (old.level, new.level] — um salto de 2
--     níveis numa tacada paga 100, e só os níveis ainda não pagos entram.
--
-- BEGIN/EXCEPTION igual ao boss_hits_after_completion, pela mesma razão: este
-- trigger roda DENTRO da transação de conclusão de missão. Perder 50 de ouro
-- em silêncio (com WARNING no log) é infinitamente melhor do que derrubar a
-- conclusão e o XP do usuário.
create or replace function public.award_level_gold()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  -- espelha GOLD_PER_LEVEL no cliente (src/lib/xp-system.ts).
  v_reward  constant integer := 50;
  v_de      integer;
  v_ate     integer;
  v_niveis  integer := 0;
begin
  begin
    -- clamps: nível legado 0/negativo não gera série inválida; o teto 999 é o
    -- mesmo de xp_level_from_total e o do CHECK do ledger.
    v_de  := greatest(coalesce(old.level, 1), 1) + 1;
    v_ate := least(new.level, 999);
    if v_ate < v_de then
      return new;
    end if;

    -- ON CONFLICT DO NOTHING + RETURNING: só voltam as linhas REALMENTE
    -- inseridas. Nível já pago não retorna nada e portanto não paga nada.
    with novos as (
      insert into level_rewards (user_id, level, gold, reason)
      select new.id, lvl, v_reward, 'level_up'
        from generate_series(v_de, v_ate) as lvl
      on conflict (user_id, level) do nothing
      returning 1
    )
    select count(*)::int into v_niveis from novos;

    if v_niveis > 0 then
      -- soma sobre o NEW: se o mesmo UPDATE também mexer em gold (um gasto
      -- futuro), os dois efeitos convivem sem se sobrescrever.
      new.gold := coalesce(new.gold, 0) + (v_niveis * v_reward);
    end if;

  exception when others then
    raise warning 'award_level_gold falhou (ouro ignorado): %', sqlerrm;
    return new;
  end;
  return new;
end; $$;

-- função de trigger: ninguém executa direto.
revoke execute on function public.award_level_gold() from public, anon, authenticated;

drop trigger if exists profiles_award_level_gold on public.profiles;
create trigger profiles_award_level_gold
  before update on public.profiles
  for each row
  when (new.level > old.level)
  execute function public.award_level_gold();


-- ------------------------------------------------------------
-- 4) OPCIONAL — OURO RETROATIVO PARA QUEM JÁ SUBIU DE NÍVEL
-- ------------------------------------------------------------
-- Recomendação do DBA: RODE. Não é generosidade, é fechar um buraco.
--
-- Sem esta parte, o ledger de um veterano de nível 20 nasce VAZIO. Ele pode
-- reverter missões até cair para o 19, reconcluir e receber 50 pelo nível 20;
-- repetir até o 2 e colher 950 no total — exatamente o valor do retroativo,
-- só que pago a quem tiver paciência de farmar reversão. Não rodar não economiza
-- ouro: apenas transfere para quem grinda.
-- Além disso o valor é seguro hoje: não existe nenhum SUMIDOURO de ouro no
-- produto ainda (nada é comprável com ouro), então o retroativo não desequilibra
-- economia nenhuma.
--
-- IDEMPOTENTE: o ON CONFLICT garante que a segunda execução insira 0 linhas e,
-- por consequência, some 0 ao saldo. Rodar duas vezes NÃO paga duas vezes.
-- O UPDATE não toca em `level`, então o trigger da PARTE 3 não dispara aqui —
-- não existe crédito em dobro.
--
-- ALTERNATIVA (se o dono decidir NÃO pagar retroativo): troque `50` por `0` e
-- 'backfill' por 'grandfathered'. Isso registra os níveis antigos como já
-- resolvidos, sem pagar nada, e fecha o mesmo buraco de farm por reversão.
-- Fazer NADA é a única opção errada.
with novos as (
  insert into public.level_rewards (user_id, level, gold, reason)
  select p.id, lvl, 50, 'backfill'
    from public.profiles p
    cross join lateral generate_series(2, least(greatest(p.level, 1), 999)) as lvl
  on conflict (user_id, level) do nothing
  returning user_id, gold
), somas as (
  select user_id, sum(gold)::int as total
    from novos
   group by user_id
)
update public.profiles p
   set gold = coalesce(p.gold, 0) + s.total
  from somas s
 where p.id = s.user_id;


-- ------------------------------------------------------------
-- 5) GRANTS — leia antes de aplicar a blindagem de 2026-xp-fix
-- ------------------------------------------------------------
-- ESTE ARQUIVO NÃO PRECISA DE NENHUM GRANT EM profiles. Os privilégios de
-- `authenticated` sobre profiles são de TABELA (não há grant por coluna em
-- lugar nenhum do repo hoje), e privilégio de tabela cobre automaticamente
-- toda coluna nova. gold nasce legível e gravável exatamente como crystals.
--
-- O incidente citado (grant de coluna que quebrou updateMyProfile por esquecer
-- `id`) só existe DEPOIS que a PARTE 3 de supabase/2026-xp-fix.sql for
-- descomentada. Quando esse dia chegar:
--   * `gold` NÃO entra na lista gravável — ele é escrito pelo trigger security
--     definer, que ignora grants do chamador;
--   * `id` continua obrigatório na lista (upsert do PostgREST põe a coluna do
--     conflito no SET);
--   * a lista atual (id, name, nickname, tag, avatar_url, character_class,
--     character_skin, character_background) permanece correta como está.
--
-- Enquanto a blindagem não for aplicada, gold é forjável por PATCH direto —
-- igual a crystals e total_xp hoje. O ledger limita o estrago: um saldo forjado
-- fica evidente na conferência da PARTE 6 e é reconstruível a partir dele.
--
-- NÃO adicione gold à view public.public_profiles: ela é lista explícita de
-- colunas e roda sem security_invoker, ou seja, o que entrar ali fica legível
-- para TODOS os autenticados. Saldo é privado, como crystals.


-- ------------------------------------------------------------
-- 6) CONFERÊNCIA (somente leitura — nada é alterado)
-- ------------------------------------------------------------
-- Invariante: saldo do profile == soma do ledger (enquanto não houver gasto de
-- ouro no produto). Esta query deve voltar VAZIA.
select p.id, p.nickname, p.level, p.gold as saldo_no_profile,
       coalesce(l.total, 0) as pelo_ledger,
       p.gold - coalesce(l.total, 0) as diferenca
  from public.profiles p
  left join (
    select user_id, sum(gold)::int as total
      from public.level_rewards
     group by user_id
  ) l on l.user_id = p.id
 where p.gold <> coalesce(l.total, 0)
 order by diferenca desc;

-- Depois da PARTE 4, todo mundo deve satisfazer gold = 50 * (level - 1):
-- select count(*) from public.profiles where gold <> 50 * greatest(level - 1, 0);

-- Trigger no lugar (deve devolver 1 linha):
-- select tgname, tgenabled from pg_trigger
--  where tgrelid = 'public.profiles'::regclass and tgname = 'profiles_award_level_gold';

-- ------------------------------------------------------------
-- recarrega o cache do PostgREST (sem isto: PGRST204 e `select *` sem gold)
notify pgrst, 'reload schema';
