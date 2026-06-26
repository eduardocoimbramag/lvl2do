-- ============================================================
-- lvl2do — migração social: amigos, ranking, loja e indicações
-- Rode no SQL Editor do Supabase (idempotente).
-- Depende de: schema.sql + 2026-progress-streak.sql (xp_events).
-- ============================================================

-- ------------------------------------------------------------
-- 1) PROFILES — novas colunas (país, cristais, código de indicação,
--    XP do ano para o ranking "Anual").
-- ------------------------------------------------------------
alter table public.profiles add column if not exists country text not null default 'br';
alter table public.profiles add column if not exists crystals integer not null default 0;
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists year_xp integer not null default 0;
alter table public.profiles
  add column if not exists year_xp_year integer not null default extract(year from now())::int;

-- código de indicação único (8 chars). Backfill para linhas existentes.
update public.profiles
  set referral_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  where referral_code is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_referral_code_key'
  ) then
    alter table public.profiles add constraint profiles_referral_code_key unique (referral_code);
  end if;
end $$;

-- ------------------------------------------------------------
-- 2) VIEW pública de perfis — expõe SÓ colunas seguras para todos os
--    usuários autenticados (ranking/amigos). A tabela base continua
--    legível apenas pelo dono (crystals, referral_code ficam privados).
-- ------------------------------------------------------------
create or replace view public.public_profiles as
  select id, nickname, tag, avatar_url, character_class, character_skin,
         level, total_xp, year_xp, current_streak, best_streak, country
  from public.profiles;

grant select on public.public_profiles to authenticated;

-- ------------------------------------------------------------
-- 3) YEAR_XP — mantido a partir do log xp_events (reseta a cada ano).
-- ------------------------------------------------------------
create or replace function public.apply_xp_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare cur_year int := extract(year from now())::int;
begin
  update public.profiles p set
    year_xp = greatest(0, (case when p.year_xp_year = cur_year then p.year_xp else 0 end) + new.amount),
    year_xp_year = cur_year
  where p.id = new.user_id;
  return new;
end; $$;

drop trigger if exists xp_events_apply on public.xp_events;
create trigger xp_events_apply
  after insert on public.xp_events
  for each row execute function public.apply_xp_event();

-- ------------------------------------------------------------
-- 4) FRIENDSHIPS — amizade mútua (2 linhas por par). Inserção/remoção
--    via funções SECURITY DEFINER; leitura apenas das próprias linhas.
-- ------------------------------------------------------------
create table if not exists public.friendships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  friend_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own" on public.friendships
  for select using (auth.uid() = user_id);

create or replace function public.add_friend(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if target = auth.uid() then raise exception 'cannot befriend self'; end if;
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'target not found';
  end if;
  insert into public.friendships(user_id, friend_id) values (auth.uid(), target)
    on conflict do nothing;
  insert into public.friendships(user_id, friend_id) values (target, auth.uid())
    on conflict do nothing;
end; $$;

create or replace function public.remove_friend(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.friendships
    where (user_id = auth.uid() and friend_id = target)
       or (user_id = target and friend_id = auth.uid());
end; $$;

grant execute on function public.add_friend(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5) REDEMPTIONS (loja) — troca de cristais por produtos físicos.
--    Débito atômico via função (checa saldo, debita e registra).
-- ------------------------------------------------------------
create table if not exists public.redemptions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_id   text not null,
  product_name text not null,
  cost         integer not null,
  status       text not null default 'requested',
  created_at   timestamptz not null default now()
);

alter table public.redemptions enable row level security;

drop policy if exists "redemptions_select_own" on public.redemptions;
create policy "redemptions_select_own" on public.redemptions
  for select using (auth.uid() = user_id);

create or replace function public.redeem_product(p_product_id text, p_product_name text, p_cost int)
returns integer language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  if p_cost < 0 then raise exception 'invalid cost'; end if;
  select crystals into bal from public.profiles where id = auth.uid() for update;
  if bal is null then raise exception 'profile not found'; end if;
  if bal < p_cost then raise exception 'insufficient crystals'; end if;

  update public.profiles set crystals = crystals - p_cost where id = auth.uid();
  insert into public.redemptions(user_id, product_id, product_name, cost)
    values (auth.uid(), p_product_id, p_product_name, p_cost);
  return bal - p_cost;
end; $$;

grant execute on function public.redeem_product(text, text, int) to authenticated;

-- ------------------------------------------------------------
-- 6) REFERRALS — indicações. Uma linha por indicado (único).
-- ------------------------------------------------------------
create table if not exists public.referrals (
  id           bigint generated always as identity primary key,
  referrer_id  uuid not null references auth.users(id) on delete cascade,
  referred_id  uuid not null references auth.users(id) on delete cascade unique,
  status       text not null default 'confirmed',
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz default now()
);

alter table public.referrals enable row level security;

drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own" on public.referrals
  for select using (auth.uid() = referrer_id);

-- ------------------------------------------------------------
-- 7) HANDLE_NEW_USER — cria o profile, gera referral_code e, se o
--    cadastro veio com ?ref=CODE, credita o indicador (+15 cristais).
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare ref_code text; ref_id uuid;
begin
  insert into public.profiles (id, name, referral_code)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  )
  on conflict (id) do nothing;

  ref_code := nullif(new.raw_user_meta_data->>'ref_code', '');
  if ref_code is not null then
    select id into ref_id from public.profiles where referral_code = upper(ref_code) limit 1;
    if ref_id is not null and ref_id <> new.id then
      insert into public.referrals(referrer_id, referred_id)
        values (ref_id, new.id) on conflict (referred_id) do nothing;
      update public.profiles set crystals = crystals + 15 where id = ref_id;
    end if;
  end if;

  return new;
end; $$;

-- ------------------------------------------------------------
notify pgrst, 'reload schema';
