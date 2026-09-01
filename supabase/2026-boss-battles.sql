-- ============================================================
-- lvl2do — Boss Battles (widget TBH "Task Bar Hero") — v2
-- ============================================================
-- Um boss de 100 HP por (usuário, categoria). Cada conclusão de missão
-- 'done' causa 2 de dano no boss DA CATEGORIA da missão, com no máximo
-- 5 hits por DIA REAL por boss (anti-abuso). O dano é aplicado por TRIGGER
-- no servidor sobre mission_completions — nunca pelo cliente: funciona
-- de qualquer tela e não dá para forjar.
--
-- v2 — correções da revisão de segurança:
--  * FK boss_hits.mission_id: ON DELETE SET NULL (era CASCADE). Com CASCADE,
--    apagar a missão apagava o hit e REBAIXAVA o contador do cap — loop
--    criar→concluir→apagar matava o boss no mesmo dia. Um ledger anti-abuso
--    não pode ser apagável pelo auditado.
--  * Cap ancorado no DIA REAL do servidor (coluna capped_on), não em
--    completed_for_date: p_completed_for_date é controlado pelo cliente sem
--    clamp, então "5 por dia de conclusão" era fragmentável em datas
--    inventadas (5 por data = ilimitado). Agora são 5 hits por dia-calendário
--    real (America/Sao_Paulo), independente da data que o cliente enviar.
--    Matar o boss exige >= 10 dias reais (requisito 6). Efeito colateral BOM:
--    conclusão retroativa via calendário passa a mover os pips de HOJE.
--
-- Regras duras:
--  * HP persistente: o boss NUNCA reseta sozinho (mata-se ao longo dos dias).
--  * Reset SOMENTE via RPC collect_boss_treasure quando hp = 0.
--  * Revert NÃO cura: trigger é AFTER INSERT apenas; o ledger boss_hits tem
--    unique (user, mission, dia-da-conclusão) — complete→revert→complete no
--    MESMO dia re-insere em mission_completions, mas NÃO re-bate no boss.
--  * Sem recompensa ainda (ver comentário em collect_boss_treasure).
--
-- Rode no SQL Editor do Supabase. Idempotente (pode rodar mais de uma vez),
-- inclusive sobre base que já tenha a v1 (bloco de retrofit abaixo).
-- ============================================================

-- ------------------------------------------------------------
-- 1) boss_battles — estado persistente do boss por (usuário, categoria)
-- ------------------------------------------------------------
create table if not exists public.boss_battles (
  user_id     uuid not null references auth.users(id) on delete cascade,
  /** categoria = arena fixa: dragão→Profissional, cavaleiro→Pessoal, orc→Saúde. */
  category    text not null check (category in ('Profissional', 'Pessoal', 'Saúde')),
  /** vida atual; 100 = cheio, 0 = derrotado (aguardando coleta do tesouro). */
  hp          integer not null default 100 check (hp between 0 and 100),
  /** carimbo da derrota; limpo apenas pela coleta do tesouro. */
  defeated_at timestamptz,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  primary key (user_id, category)
);

-- ------------------------------------------------------------
-- 2) boss_hits — ledger de dano (fonte de verdade do cap diário)
-- ------------------------------------------------------------
-- Cada linha = um hit que EFETIVAMENTE descontou HP. Dois dias distintos por
-- linha, de propósito:
--  * hit_on    = dia DA CONCLUSÃO (controlado pelo cliente) → só para o
--                dedupe "mesma missão, mesmo dia" (unique abaixo).
--  * capped_on = dia REAL do servidor → âncora do cap de 5/dia (o cliente
--                não controla; datas retroativas/inventadas não fragmentam).
create table if not exists public.boss_hits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  /** SET NULL, não CASCADE: apagar a missão NÃO apaga o hit — o count() do
      cap permanece íntegro. (Com CASCADE o cap era trivialmente burlável.)
      Nullable exatamente por isso. O trigger nunca INSERE null (guarda). */
  mission_id uuid references public.missions(id) on delete set null,
  category   text not null check (category in ('Profissional', 'Pessoal', 'Saúde')),
  /** dia da conclusão (copiado de completed_for_date) — dedupe apenas. */
  hit_on     date not null,
  /** dia real do servidor no momento do hit — base do cap diário. */
  capped_on  date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  /** dano efetivamente aplicado (2, ou menos se o boss tinha < 2 de HP). */
  damage     integer not null default 2 check (damage between 1 and 2),
  created_at timestamptz not null default now()
);

-- RETROFIT (base que já rodou a v1) — create table if not exists NÃO altera
-- tabela existente; este bloco normaliza. Em instalação nova é no-op inócuo
-- (o drop+add recria a FK idêntica). Todos os comandos são re-executáveis.
alter table public.boss_hits alter column mission_id drop not null;
alter table public.boss_hits drop constraint if exists boss_hits_mission_id_fkey;
alter table public.boss_hits
  add constraint boss_hits_mission_id_fkey
  foreign key (mission_id) references public.missions(id) on delete set null;
-- linhas pré-v2 recebem capped_on = dia da migração (tabela minúscula; pior
-- caso: o cap de HOJE nasce parcialmente consumido uma única vez — aceito).
alter table public.boss_hits
  add column if not exists capped_on date not null
  default ((now() at time zone 'America/Sao_Paulo')::date);

-- Dedupe: unique index (não constraint) para ser idempotente com IF NOT
-- EXISTS; é o alvo do ON CONFLICT do trigger. mission_id NULL (missão
-- apagada) nunca conflita em unique — ou seja, hits órfãos não se bloqueiam
-- nem somem: o cap continua contando todos.
create unique index if not exists boss_hits_user_mission_day_unique
  on public.boss_hits (user_id, mission_id, hit_on);

-- v2: o cap consulta capped_on; índice antigo por hit_on sai de cena.
drop index if exists public.boss_hits_user_cat_day_idx;
create index if not exists boss_hits_user_cat_capped_idx
  on public.boss_hits (user_id, category, capped_on);

-- ------------------------------------------------------------
-- 3) Trigger AFTER INSERT em mission_completions — aplica o dano
-- ------------------------------------------------------------
-- Os .sql do repo não criam nenhum outro trigger nesta tabela; o estado do
-- BANCO deve ser conferido no smoke test (query em pg_trigger — seção 9).
--
-- LOCK: NÃO precisa de advisory lock (diferente da cota de stories). A linha
-- do boss (user, category) é o mutex natural: SELECT ... FOR UPDATE serializa
-- cap + ledger + hp. Na prática a serialização já vem de cima —
-- complete_mission_atomic trava o profile com FOR UPDATE no início — mas o
-- lock do boss é defesa-em-profundidade para fluxos futuros.
--
-- EXCEPTION: o trigger roda DENTRO de complete_mission_atomic; uma exceção
-- aqui derrubaria a conclusão + XP (caminho crítico). Decisão: BEGIN/EXCEPTION
-- — perder 2 de dano silenciosamente é muito melhor do que bloquear a
-- conclusão. Custo: uma subtransação por conclusão — desprezível. O RAISE
-- WARNING deixa rastro nos logs do Postgres.
create or replace function public.boss_hits_after_completion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_dedupe_day date;
  v_real_day   date;
  v_hp         integer;
  v_hits       integer;
  v_damage     integer;
begin
  begin -- sub-bloco: o dano NUNCA pode derrubar a conclusão da missão

    -- status = 'done' já é filtrado pelo WHEN do trigger.
    -- mission_id null (linha órfã/legada): sem missão não há dedupe possível
    -- (null nunca conflita no unique) — seria dano infinito. Ignora.
    if new.mission_id is null then
      return new;
    end if;

    -- snapshot fora das 3 categorias (dado legado/futuro) → sem arena, sem erro.
    if new.category_snapshot not in ('Profissional', 'Pessoal', 'Saúde') then
      return new;
    end if;

    -- dia da conclusão (cliente) — SÓ dedupe. happened_on é NOT NULL: fallback total.
    v_dedupe_day := coalesce(new.completed_for_date, new.happened_on);
    -- dia real do servidor — âncora do cap (inforjável pelo cliente).
    v_real_day := (now() at time zone 'America/Sao_Paulo')::date;

    -- garante a linha do boss (primeiro hit cria a arena com 100 HP)...
    insert into boss_battles (user_id, category)
    values (new.user_id, new.category_snapshot)
    on conflict (user_id, category) do nothing;

    -- ...e trava-a: mutex por (usuário, categoria) — ver nota de LOCK acima.
    select hp into v_hp
      from boss_battles
     where user_id = new.user_id and category = new.category_snapshot
       for update;

    -- boss morto: fica morto até a coleta (nunca auto-reseta). Não gasta cap.
    if v_hp <= 0 then
      return new;
    end if;

    -- cap anti-abuso: máx. 5 hits por DIA REAL por boss (v2 — antes contava
    -- por hit_on, fragmentável em datas arbitrárias do cliente).
    select count(*) into v_hits
      from boss_hits
     where user_id = new.user_id
       and category = new.category_snapshot
       and capped_on = v_real_day;
    if v_hits >= 5 then
      return new;
    end if;

    -- 2 de dano por conclusão; nunca abaixo de 0 (CHECK 1..2 no ledger).
    v_damage := least(2, v_hp);

    -- ON CONFLICT DO NOTHING: a MESMA missão no MESMO dia-de-conclusão não
    -- re-bate (complete→revert→complete re-insere em mission_completions,
    -- mas o ledger barra o segundo hit).
    insert into boss_hits (user_id, mission_id, category, hit_on, capped_on, damage)
    values (new.user_id, new.mission_id, new.category_snapshot, v_dedupe_day, v_real_day, v_damage)
    on conflict (user_id, mission_id, hit_on) do nothing;

    -- SÓ desconta HP se o hit realmente entrou: em plpgsql, INSERT ... ON
    -- CONFLICT DO NOTHING deixa FOUND = false quando o conflito engoliu a linha.
    if not found then
      return new;
    end if;

    update boss_battles
       set hp          = greatest(hp - v_damage, 0),
           defeated_at = case when hp - v_damage <= 0 then now() else defeated_at end,
           updated_at  = now()
     where user_id = new.user_id and category = new.category_snapshot;

  exception when others then
    raise warning 'boss_hits_after_completion falhou (dano ignorado): %', sqlerrm;
    return new;
  end;
  return new;
end; $$;

-- trigger function: ninguém executa diretamente (só o trigger dispara).
revoke execute on function public.boss_hits_after_completion() from public, anon, authenticated;

drop trigger if exists boss_hits_after_completion on public.mission_completions;
create trigger boss_hits_after_completion
  after insert on public.mission_completions
  for each row
  when (new.status = 'done')
  execute function public.boss_hits_after_completion();

-- ------------------------------------------------------------
-- 4) RLS + grants mínimos
-- ------------------------------------------------------------
-- Leitura própria apenas; TODA escrita passa pelo trigger/RPCs (security
-- definer, que ignoram RLS por rodarem como o dono das tabelas).
alter table public.boss_battles enable row level security;
alter table public.boss_hits enable row level security;

drop policy if exists "boss_battles_select_own" on public.boss_battles;
create policy "boss_battles_select_own" on public.boss_battles
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "boss_hits_select_own" on public.boss_hits;
create policy "boss_hits_select_own" on public.boss_hits
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.boss_battles from anon, authenticated;
revoke all on public.boss_hits from anon, authenticated;
grant select on public.boss_battles to authenticated;
grant select on public.boss_hits to authenticated;

-- ------------------------------------------------------------
-- 5) RPC: get_boss_battles — estado das 3 arenas + hits de hoje
-- ------------------------------------------------------------
-- MATERIALIZA as 3 linhas ausentes (upsert no-op quando existem): o cliente
-- sempre recebe exatamente 3 objetos e collect nunca trata linha inexistente.
-- p_today: mantido na assinatura por compatibilidade com o cliente já
-- publicado, mas IGNORADO desde a v2 — hits_today conta pelo dia REAL do
-- servidor (mesma âncora do cap; produto é BR, fuso America/Sao_Paulo).
create or replace function public.get_boss_battles(p_today date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_real_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_result jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  insert into boss_battles (user_id, category)
  select v_uid, t.c
    from (values ('Profissional'), ('Pessoal'), ('Saúde')) as t(c)
  on conflict (user_id, category) do nothing;

  select jsonb_agg(
           jsonb_build_object(
             'category',    b.category,
             'hp',          b.hp,
             'max_hp',      100,
             'defeated_at', b.defeated_at,
             'hits_today',  coalesce(h.cnt, 0),
             'updated_at',  b.updated_at
           )
           order by case b.category
             when 'Profissional' then 1
             when 'Pessoal'      then 2
             else                     3
           end
         )
    into v_result
    from boss_battles b
    left join (
      select category, count(*)::int as cnt
        from boss_hits
       where user_id = v_uid and capped_on = v_real_day
       group by category
    ) h on h.category = b.category
   where b.user_id = v_uid;

  return coalesce(v_result, '[]'::jsonb);
end; $$;

revoke execute on function public.get_boss_battles(date) from public, anon;
grant execute on function public.get_boss_battles(date) to authenticated;

-- ------------------------------------------------------------
-- 6) RPC: collect_boss_treasure — reset manual, SÓ com boss morto
-- ------------------------------------------------------------
create or replace function public.collect_boss_treasure(
  p_category text,
  p_today date default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_real_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_hp integer;
  v_hits integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_category not in ('Profissional', 'Pessoal', 'Saúde') then
    raise exception 'invalid_category';
  end if;

  -- FOR UPDATE: duas coletas simultâneas serializam; a segunda vê hp = 100
  -- e falha com boss_not_defeated (sem tesouro duplo no futuro).
  select hp into v_hp
    from boss_battles
   where user_id = v_uid and category = p_category
     for update;
  if not found then raise exception 'boss_not_found'; end if;
  if v_hp > 0 then raise exception 'boss_not_defeated'; end if;

  -- >>> RECOMPENSA ENTRA AQUI (mesma transação, antes do reset): creditar
  -- >>> tesouro/XP/item usando defeated_at como carimbo do ciclo vencido.
  -- >>> Por ora, sem recompensa (requisito 3).

  update boss_battles
     set hp = 100,
         defeated_at = null,
         updated_at = now()
   where user_id = v_uid and category = p_category;

  -- mesmo dia real do cap (v2): o cliente adota este objeto direto.
  select count(*)::int into v_hits
    from boss_hits
   where user_id = v_uid and category = p_category and capped_on = v_real_day;

  return jsonb_build_object(
    'category',    p_category,
    'hp',          100,
    'max_hp',      100,
    'defeated_at', null,
    'hits_today',  v_hits,
    'updated_at',  now()
  );
end; $$;

revoke execute on function public.collect_boss_treasure(text, date) from public, anon;
grant execute on function public.collect_boss_treasure(text, date) to authenticated;

-- recarrega o cache do PostgREST
notify pgrst, 'reload schema';
