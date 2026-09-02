-- ============================================================
-- lvl2do — mission_completions + RPCs ATÔMICAS de XP
-- ============================================================
-- Objetivo: impedir DEFINITIVAMENTE o estado "missão concluída sem XP".
-- Uma única transação (RPC) grava: conclusão por dia (mission_completions),
-- XP/level/orçamentos no profile, status da missão, streak e xp_events.
-- Se qualquer etapa falhar, NADA é gravado (rollback automático da função).
--
-- Rode no SQL Editor do Supabase. Idempotente (pode rodar mais de uma vez).
-- Espelha a tabela criada manualmente; `create table if not exists` não altera
-- uma tabela já existente.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tabela de conclusões por (missão, dia) — fonte de verdade
-- ------------------------------------------------------------
-- Espelha EXATAMENTE a tabela real já existente no Supabase.
-- `create table if not exists` é no-op quando a tabela já existe: não altera
-- schema, não apaga dados, não remove colunas legadas.
create table if not exists public.mission_completions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  mission_id          uuid references public.missions(id) on delete cascade,
  /** snapshots da missão no momento da conclusão (imutáveis). */
  title_snapshot      text not null,
  category_snapshot   text not null,
  difficulty_snapshot text not null,
  xp_snapshot         integer not null default 0,
  /** status da conclusão: 'done' | 'failed' | 'reverted' (CHECK do banco). */
  status              text not null,
  /** dia (date) a que a conclusão pertence — usado por happened_on. */
  happened_on         date not null default current_date,
  happened_at         timestamptz not null default now(),
  /** dia LOCAL ("YYYY-MM-DD", calendário do usuário) a que a conclusão pertence. */
  completed_for_date  date,
  /** XP base da missão no momento da conclusão. */
  original_xp         integer default 0,
  /** XP efetivamente creditado (após o limite diário de 300). */
  credited_xp         integer default 0,
  completed_at        timestamptz default now(),
  /** null = conclusão ativa; preenchido = desfeita. */
  reverted_at         timestamptz,
  /** origem: 'mission' | 'focus' | 'calendar' ... */
  source              text default 'app',
  metadata            jsonb default '{}',
  created_at          timestamptz default now()
);

create index if not exists mission_completions_user_date_idx
  on public.mission_completions (user_id, completed_for_date);
create index if not exists mission_completions_mission_idx
  on public.mission_completions (mission_id);

-- No máximo UMA conclusão ATIVA por (usuário, missão, dia) — barreira física
-- contra duplo crédito, mesmo com duas abas/cliques simultâneos.
create unique index if not exists mission_completions_active_unique
  on public.mission_completions (user_id, mission_id, completed_for_date)
  where reverted_at is null;

alter table public.mission_completions enable row level security;

drop policy if exists "mission_completions_select_own" on public.mission_completions;
create policy "mission_completions_select_own" on public.mission_completions
  for select using (auth.uid() = user_id);

-- delete próprio: usado apenas pelo "master reset" de desenvolvimento.
drop policy if exists "mission_completions_delete_own" on public.mission_completions;
create policy "mission_completions_delete_own" on public.mission_completions
  for delete using (auth.uid() = user_id);

-- escrita SOMENTE pelas RPCs (security definer) — sem policies de insert/update.
grant select, delete on public.mission_completions to authenticated;

-- ------------------------------------------------------------
-- 2) Nível a partir do XP total (espelha src/lib/xp-system.ts)
--    1–9: 800/nível · 10–49: 1200 · 50–99: 1600 · 100+: 2000
-- ------------------------------------------------------------
create or replace function public.xp_level_from_total(p_total integer)
returns integer language plpgsql immutable as $$
declare
  lvl integer := 1;
  rest integer := greatest(0, p_total);
  need integer;
begin
  loop
    need := case
      when lvl < 10 then 800
      when lvl < 50 then 1200
      when lvl < 100 then 1600
      else 2000
    end;
    exit when rest < need or lvl >= 999;
    rest := rest - need;
    lvl := lvl + 1;
  end loop;
  return lvl;
end; $$;

-- ------------------------------------------------------------
-- 3) RPC: concluir missão ATOMICAMENTE
-- ------------------------------------------------------------
create or replace function public.complete_mission_atomic(
  p_mission_id uuid,
  p_completed_for_date date default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  -- fuso do produto (BR): usado só como fallback quando o cliente não envia a data
  v_date date := coalesce(p_completed_for_date, (now() at time zone 'America/Sao_Paulo')::date);
  v_mission missions%rowtype;
  v_profile profiles%rowtype;
  v_old_daily_date date;
  v_used integer;
  v_credited integer;
  v_used_after integer;
  v_is_today boolean;
  v_completion_id uuid;
  v_happened_at timestamptz;
  v_prev date;
  v_new_streak integer;
  v_new_best integer;
  v_total integer;
  v_profile_json jsonb;
  v_mission_json jsonb;
  v_boss_hp_before integer;
  v_boss           jsonb;
  v_boss_damage    integer := 0;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  -- trava a linha do profile: serializa operações de XP por usuário
  select * into v_profile from profiles where id = v_uid for update;
  if not found then raise exception 'profile_not_found'; end if;

  select * into v_mission from missions where id = p_mission_id;
  if not found or v_mission.user_id <> v_uid then raise exception 'mission_not_found'; end if;

  -- duplo crédito: já existe conclusão ATIVA desta missão neste dia?
  if exists (
    select 1 from mission_completions
     where user_id = v_uid and mission_id = p_mission_id
       and completed_for_date = v_date and reverted_at is null
  ) then
    raise exception 'duplicate_completion';
  end if;
  -- missão "uma vez" já concluída (status global) também bloqueia
  if v_mission.schedule_type = 'today' and v_mission.status = 'done' then
    raise exception 'duplicate_completion';
  end if;

  -- orçamento usado no dia-alvo: SOMA das conclusões ativas (fonte de verdade),
  -- reforçada pelos contadores do profile (histórico anterior à tabela).
  select coalesce(sum(credited_xp), 0) into v_used
    from mission_completions
   where user_id = v_uid and completed_for_date = v_date and reverted_at is null;
  if v_date = v_profile.daily_xp_date then
    v_used := greatest(v_used, coalesce(v_profile.daily_xp, 0));
  elsif v_date = v_profile.yesterday_xp_date then
    v_used := greatest(v_used, coalesce(v_profile.yesterday_xp, 0));
  end if;

  -- limite diário de 300 XP
  v_credited := greatest(0, least(v_mission.xp, 300 - v_used));
  v_used_after := v_used + v_credited;

  v_old_daily_date := v_profile.daily_xp_date;
  v_is_today := v_old_daily_date is null or v_date >= v_old_daily_date;

  -- timestamp coerente com o dia-alvo: hoje = agora; retroativo = meio-dia
  -- (12h) local do próprio dia, para o evento cair na data correta.
  v_happened_at := case
    when v_is_today then now()
    else (v_date::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo'
  end;

  -- HP do boss ANTES do insert. O trigger boss_hits_after_completion é
  -- AFTER INSERT na MESMA transação, então o delta lido depois é o dano exato,
  -- inclusive os zeros (cap de 5/dia, boss morto, re-conclusão barrada pelo
  -- ledger). É isso que dispensa o cliente de adivinhar se houve dano.
  select hp into v_boss_hp_before
    from boss_battles
   where user_id = v_uid and category = v_mission.category;
  v_boss_hp_before := coalesce(v_boss_hp_before, 100);

  -- 3.1 registra a conclusão (barrada pelo índice único se houver corrida)
  insert into mission_completions (
    user_id, mission_id,
    title_snapshot, category_snapshot, difficulty_snapshot, xp_snapshot, status,
    happened_on, happened_at,
    completed_for_date, original_xp, credited_xp, source
  )
  values (
    v_uid, p_mission_id,
    v_mission.title, v_mission.category, v_mission.difficulty, v_mission.xp, 'done',
    v_date, v_happened_at,
    v_date, v_mission.xp, v_credited, 'mission'
  )
  returning id into v_completion_id;

  -- Estado do boss DEPOIS do trigger, no mesmo shape de get_boss_battles, para
  -- o cliente adotar sem refetch.
  select jsonb_build_object(
           'category',    b.category,
           'hp',          b.hp,
           'max_hp',      100,
           'defeated_at', b.defeated_at,
           'hits_today',  (
             select count(*)::int from boss_hits h
              where h.user_id = v_uid
                and h.category = b.category
                and h.capped_on = (now() at time zone 'America/Sao_Paulo')::date
           ),
           'updated_at',  b.updated_at
         ),
         greatest(0, v_boss_hp_before - b.hp)
    into v_boss, v_boss_damage
    from boss_battles b
   where b.user_id = v_uid and b.category = v_mission.category;

  -- 3.2 status da missão: só "uma vez" usa o status global
  if v_mission.schedule_type = 'today' then
    update missions set status = 'done', completed_at = now(), failed_at = null
     where id = p_mission_id;
  end if;

  -- 3.3 streak (só quando a conclusão é do dia "atual" do usuário)
  v_new_streak := v_profile.current_streak;
  v_new_best   := v_profile.best_streak;
  if v_is_today then
    if not exists (
      select 1 from mission_completions
       where user_id = v_uid and completed_for_date = v_date
         and reverted_at is null and id <> v_completion_id
    ) then
      select max(completed_for_date) into v_prev
        from mission_completions
       where user_id = v_uid and reverted_at is null and completed_for_date < v_date;
      -- fallback p/ contas anteriores à tabela: última conclusão do profile
      if v_prev is null and v_profile.last_mission_completed_at is not null then
        v_prev := (v_profile.last_mission_completed_at at time zone 'America/Sao_Paulo')::date;
      end if;
      if v_prev is null then
        v_new_streak := 1;
      elsif v_prev = v_date - 1 then
        v_new_streak := v_profile.current_streak + 1;
      elsif v_prev >= v_date then
        v_new_streak := v_profile.current_streak; -- já contou "hoje"
      else
        v_new_streak := 1; -- sequência quebrada → recomeça
      end if;
      v_new_best := greatest(v_new_best, v_new_streak);
    end if;
  end if;

  -- 3.4 profile: total/level + orçamentos por dia + streak
  v_total := greatest(0, coalesce(v_profile.total_xp, 0) + v_credited);
  update profiles set
    total_xp = v_total,
    level    = xp_level_from_total(v_total),
    -- orçamentos: hoje / rolagem de virada / ontem / dia antigo (só total)
    daily_xp = case
      when v_date = v_old_daily_date then v_used_after
      when v_old_daily_date is null or v_date > v_old_daily_date then v_used_after
      else daily_xp end,
    daily_xp_date = case
      when v_old_daily_date is null or v_date >= v_old_daily_date then v_date
      else daily_xp_date end,
    yesterday_xp = case
      when (v_old_daily_date is not null and v_date > v_old_daily_date and v_old_daily_date = v_date - 1)
        then coalesce(v_profile.daily_xp, 0)                    -- rolagem: ontem herda o daily antigo
      when v_date = v_profile.yesterday_xp_date then v_used_after -- retro de ontem
      when v_date = v_old_daily_date - 1 then v_used_after        -- retro de ontem (colunas ainda não rolaram)
      else yesterday_xp end,
    yesterday_xp_date = case
      when (v_old_daily_date is not null and v_date > v_old_daily_date and v_old_daily_date = v_date - 1)
        then v_old_daily_date
      when v_date = v_profile.yesterday_xp_date then yesterday_xp_date
      when v_old_daily_date is not null and v_date = v_old_daily_date - 1 then v_date
      else yesterday_xp_date end,
    current_streak = v_new_streak,
    best_streak    = v_new_best,
    last_mission_completed_at = case when v_is_today then now() else last_mission_completed_at end
  where id = v_uid;

  -- 3.5 evento de XP (métricas + year_xp via trigger) — mesma transação
  insert into public.xp_events (
    user_id, mission_id, amount, reason, daily_cap_applied, happened_on, happened_at
  )
  values (
    v_uid, p_mission_id, v_credited, 'mission_done',
    v_credited < v_mission.xp, v_date, v_happened_at
  );

  select to_jsonb(p.*) into v_profile_json from profiles p where id = v_uid;
  select to_jsonb(m.*) into v_mission_json from missions m where id = p_mission_id;
  return jsonb_build_object(
    'profile', v_profile_json,
    'mission', v_mission_json,
    'credited_xp', v_credited,
    'completed_for_date', v_date,
    'boss', v_boss,
    'boss_damage', coalesce(v_boss_damage, 0)
  );
end; $$;

grant execute on function public.complete_mission_atomic(uuid, date) to authenticated;

-- ------------------------------------------------------------
-- 4) RPC: desfazer conclusão ATOMICAMENTE
-- ------------------------------------------------------------
create or replace function public.revert_mission_atomic(
  p_mission_id uuid,
  p_completed_for_date date default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_comp mission_completions%rowtype;
  v_mission missions%rowtype;
  v_profile profiles%rowtype;
  v_used_after integer;
  v_total integer;
  v_is_today boolean;
  v_profile_json jsonb;
  v_mission_json jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_profile from profiles where id = v_uid for update;
  if not found then raise exception 'profile_not_found'; end if;

  select * into v_mission from missions where id = p_mission_id;
  if not found or v_mission.user_id <> v_uid then raise exception 'mission_not_found'; end if;

  -- conclusão ativa: a do dia pedido, ou a mais recente
  select * into v_comp from mission_completions
   where user_id = v_uid and mission_id = p_mission_id and reverted_at is null
     and (p_completed_for_date is null or completed_for_date = p_completed_for_date)
   order by completed_at desc
   limit 1;
  if not found then raise exception 'completion_not_found'; end if;

  update mission_completions set reverted_at = now(), status = 'reverted' where id = v_comp.id;

  -- orçamento do dia após a reversão (soma das ativas restantes)
  select coalesce(sum(credited_xp), 0) into v_used_after
    from mission_completions
   where user_id = v_uid and completed_for_date = v_comp.completed_for_date
     and reverted_at is null;

  v_total := greatest(0, coalesce(v_profile.total_xp, 0) - v_comp.credited_xp);
  v_is_today := v_profile.daily_xp_date is null
             or v_comp.completed_for_date >= v_profile.daily_xp_date;

  update profiles set
    total_xp = v_total,
    level    = xp_level_from_total(v_total),
    daily_xp = case when v_comp.completed_for_date = daily_xp_date
                    then v_used_after else daily_xp end,
    yesterday_xp = case when v_comp.completed_for_date = yesterday_xp_date
                        then v_used_after else yesterday_xp end
  where id = v_uid;

  -- status global: só missões "uma vez"
  if v_mission.schedule_type = 'today' and v_mission.status = 'done' then
    update missions set status = 'pending', completed_at = null where id = p_mission_id;
  end if;

  insert into public.xp_events (
    user_id, mission_id, amount, reason, daily_cap_applied, happened_on, happened_at
  )
  values (
    v_uid, p_mission_id, -v_comp.credited_xp, 'mission_reverted',
    false, v_comp.completed_for_date,
    case when v_is_today then now()
         else (v_comp.completed_for_date::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo' end
  );

  select to_jsonb(p.*) into v_profile_json from profiles p where id = v_uid;
  select to_jsonb(m.*) into v_mission_json from missions m where id = p_mission_id;
  return jsonb_build_object(
    'profile', v_profile_json,
    'mission', v_mission_json,
    'reverted_xp', v_comp.credited_xp,
    'completed_for_date', v_comp.completed_for_date
  );
end; $$;

grant execute on function public.revert_mission_atomic(uuid, date) to authenticated;

-- recarrega o cache do PostgREST
notify pgrst, 'reload schema';
