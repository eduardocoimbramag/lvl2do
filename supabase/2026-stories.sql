-- ============================================================
-- lvl2do — STORIES (24h) na aba de Amigos
-- Rode no SQL Editor do Supabase (idempotente).
-- Depende de: schema.sql (profiles, missions) + 2026-social.sql (friendships,
-- public_profiles).
--
-- Modelo de autorização: um story é visível para o AUTOR e para os amigos
-- MÚTUOS dele. friendships tem 2 linhas por par, então "amigo do autor" é
-- simplesmente `friendships(user_id = eu, friend_id = autor)` — não precisa
-- de dupla checagem.
-- ============================================================

-- ------------------------------------------------------------
-- 1) STORIES
--    image_path guarda a CHAVE do objeto no bucket ("{uid}/{story_id}.jpg"),
--    nunca a URL: o bucket é privado e a URL assinada é gerada no cliente.
--    mission_* são SNAPSHOTS: o story é um registro do momento e continua
--    coerente se a missão for renomeada ou apagada depois.
-- ------------------------------------------------------------
create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  /** chave do objeto no bucket "stories". Único: um arquivo = um story. */
  image_path  text not null,
  /** proporção da imagem, para o visualizador não "pular" no carregamento. */
  width       integer,
  height      integer,
  caption     text,
  /** missão marcada (opcional). SET NULL preserva o snapshot se ela sumir. */
  mission_id       uuid references public.missions(id) on delete set null,
  mission_title    text,
  mission_category text,
  created_at  timestamptz not null default now(),
  /** 24h. Escrito SEMPRE pelo trigger — RLS não controla coluna. */
  expires_at  timestamptz not null default (now() + interval '24 hours'),
  constraint stories_expires_after_created check (expires_at > created_at),
  constraint stories_caption_len check (caption is null or char_length(caption) <= 140)
);

create unique index if not exists stories_image_path_key
  on public.stories (image_path);

-- Consulta quente da barra: "stories vivos dos meus amigos, mais novos primeiro".
-- ATENÇÃO: índice parcial com `where expires_at > now()` é IMPOSSÍVEL —
-- predicado de índice precisa ser IMMUTABLE e now() não é. Índice normal.
create index if not exists stories_user_created_idx
  on public.stories (user_id, created_at desc);

-- usado pelo GC (purga por validade).
create index if not exists stories_expires_idx
  on public.stories (expires_at);

-- ------------------------------------------------------------
-- 2) STORY_VIEWS — quem viu o quê (anel roxo x cinza).
--    PK (story_id, viewer_id): deduplica sozinho (segunda visualização é
--    no-op via ON CONFLICT) e já é o índice do lookup "eu vi este story?".
--    Índice extra em viewer_id para o caminho inverso.
-- ------------------------------------------------------------
create table if not exists public.story_views (
  story_id  uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create index if not exists story_views_viewer_idx
  on public.story_views (viewer_id);

-- ------------------------------------------------------------
-- 3) TRIGGER de entrada — a RLS só decide "linha sim/linha não", ela NÃO
--    controla colunas. Sem este trigger o cliente poderia mandar
--    expires_at = 2999, forjar mission_title ou marcar missão alheia.
--    Aqui o servidor reescreve tudo que é sensível.
-- ------------------------------------------------------------
-- Ledger de postagens (append-only). Contar `stories` deixaria a cota ser
-- zerada por delete: posta 10, apaga 10, posta mais 10, para sempre.
create table if not exists public.story_quota (
  user_id   uuid not null references auth.users(id) on delete cascade,
  posted_at timestamptz not null default now()
);
create index if not exists story_quota_user_idx on public.story_quota (user_id, posted_at desc);
alter table public.story_quota enable row level security;
revoke all on public.story_quota from anon, authenticated;

create or replace function public.stories_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_recent int;
  v_title  text;
  v_cat    text;
begin
  -- dono e janela de validade são do servidor, nunca do cliente.
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  new.created_at := now();
  new.expires_at := now() + interval '24 hours';

  -- cota: 10 stories por usuário por 24h (anti-flood e limite de storage).
  -- O lock serializa por usuário: sem ele, N inserts em paralelo leem 0 e passam.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  delete from public.story_quota
   where user_id = new.user_id and posted_at < now() - interval '48 hours';

  select count(*) into v_recent
    from public.story_quota
   where user_id = new.user_id
     and posted_at > now() - interval '24 hours';
  if v_recent >= 10 then
    raise exception 'story_limit_reached' using errcode = 'P0001';
  end if;

  insert into public.story_quota (user_id) values (new.user_id);

  -- a missão marcada precisa ser DO AUTOR; o título vem do banco, não do payload.
  if new.mission_id is not null then
    select m.title, m.category into v_title, v_cat
      from public.missions m
     where m.id = new.mission_id and m.user_id = new.user_id;
    if v_title is null then
      raise exception 'mission_not_owned' using errcode = 'P0001';
    end if;
    new.mission_title := v_title;
    new.mission_category := v_cat;
  else
    new.mission_title := null;
    new.mission_category := null;
  end if;

  return new;
end; $$;

-- image_path é DERIVADO de (dono, id). Sem isto o cliente aponta o story para
-- o arquivo de outra pessoa e reexibe foto privada ao próprio círculo (IDOR).
-- O CHECK roda DEPOIS do BEFORE trigger, que já reescreveu user_id.
alter table public.stories drop constraint if exists stories_image_path_owned;
alter table public.stories add constraint stories_image_path_owned
  check (image_path = user_id::text || '/' || id::text || '.jpg');

drop trigger if exists stories_before_insert on public.stories;
create trigger stories_before_insert
  before insert on public.stories
  for each row execute function public.stories_before_insert();

-- ------------------------------------------------------------
-- 4) RLS — stories
--    Leitura: eu + meus amigos, e só enquanto vivo.
--    A forma `user_id in (select ...)` é proposital: a subquery NÃO depende
--    da linha, então o planner a executa UMA vez (InitPlan/hashed SubPlan).
--    Um `exists (... where f.friend_id = stories.user_id)` seria correlacionado
--    e rodaria por linha.
--    `(select auth.uid())` também vira InitPlan (advisor auth_rls_initplan).
-- ------------------------------------------------------------
alter table public.stories enable row level security;

-- Policies SELECT permissivas são OR: amigo vê só o vivo, dono vê tudo.
drop policy if exists "stories_select_friends" on public.stories;
create policy "stories_select_friends" on public.stories
  for select to authenticated using (
    expires_at > now()
    and user_id in (
      select f.friend_id from public.friendships f
       where f.user_id = (select auth.uid())
    )
  );

-- O autor precisa enxergar os próprios stories expirados para fazer o GC.
drop policy if exists "stories_select_own_all" on public.stories;
create policy "stories_select_own_all" on public.stories
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "stories_insert_own" on public.stories;
create policy "stories_insert_own" on public.stories
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Story é imutável: sem policy de update (só apagar e repostar).
drop policy if exists "stories_update_own" on public.stories;

drop policy if exists "stories_delete_own" on public.stories;
create policy "stories_delete_own" on public.stories
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.stories to authenticated;

-- ------------------------------------------------------------
-- 5) RLS — story_views
--    Ler: as MINHAS visualizações + a lista de quem viu MEUS stories.
--    Inserir: só como eu mesmo e só em story que eu consigo ver — o
--    `exists` abaixo passa pela RLS de stories, então a regra de amizade
--    não é reescrita aqui (uma fonte de verdade só).
--    ARMADILHA: nunca faça uma policy de stories que consulte story_views —
--    isso fecha um ciclo e o Postgres aborta com 42P17 (infinite recursion).
-- ------------------------------------------------------------
alter table public.story_views enable row level security;

drop policy if exists "story_views_select_mine_or_owner" on public.story_views;
create policy "story_views_select_mine_or_owner" on public.story_views
  for select to authenticated using (
    viewer_id = (select auth.uid())
    or exists (
      select 1 from public.stories s
       where s.id = story_views.story_id
         and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "story_views_insert_self" on public.story_views;
create policy "story_views_insert_self" on public.story_views
  for insert to authenticated with check (
    viewer_id = (select auth.uid())
    and exists (
      select 1 from public.stories s          -- RLS de stories aplica aqui
       where s.id = story_views.story_id
         and s.expires_at > now()
    )
  );

grant select, insert on public.story_views to authenticated;

-- ------------------------------------------------------------
-- 6) BUCKET "stories" — PRIVADO.
--    Foto pessoal de 24h vista por um círculo fechado: bucket público daria
--    URL eterna e adivinhável por quem vazasse o link (e o link vaza: sai em
--    print, em cache de CDN, em histórico). Privado + URL assinada faz a
--    autorização passar pela RLS a cada geração de link.
--    Custo: sem cache de CDN por token, cada view bate na origem. Aceitável
--    para imagens de ~300 KB e uma barra com dezenas de itens.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stories', 'stories', false,
  5242880,                                            -- 5 MB (teto duro)
  array['image/jpeg', 'image/png', 'image/webp']      -- HEIC do iPhone é
                                                      -- convertido no cliente
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- 7) RLS — storage.objects
--    Convenção de path: "{user_id}/{story_id}.jpg".
--    A pasta raiz amarra o arquivo ao dono; comparação em TEXTO de propósito:
--    `(storage.foldername(name))[1]::uuid` explode se alguém subir para uma
--    pasta que não é UUID, e um erro de cast dentro de policy vira 500.
--
--    Se der "must be owner of table objects", crie estas policies pela UI
--    (Storage > Policies) — o SQL é o mesmo.
-- ------------------------------------------------------------

-- Leitura: o dono sempre (upload/GC) OU quem enxerga um story VIVO que
-- aponta para este arquivo. O `exists` reaproveita a RLS de stories, então
-- a expiração de 24h vale também para a URL assinada.
drop policy if exists "stories_objects_select" on storage.objects;
create policy "stories_objects_select" on storage.objects
  for select to authenticated using (
    bucket_id = 'stories'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.stories s
         where s.image_path = storage.objects.name
           and s.expires_at > now()
      )
    )
  );

-- O objeto só sobe para um path que JÁ tem linha em stories. Sem isto o
-- upload não passa por cota nenhuma e um loop de uploads sem insert enche o
-- bucket sem limite. Assim a cota do trigger passa a governar o storage.
drop policy if exists "stories_objects_insert" on storage.objects;
create policy "stories_objects_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.stories s
       where s.image_path = name
         and s.user_id = (select auth.uid())
    )
  );

-- SEM policy de update: o path contém um uuid recém-gerado, então colisão é
-- impossível e upsert nunca teve função. Permitir update deixaria trocar os
-- bytes de um story JÁ visualizado, falsificando o histórico de story_views.
drop policy if exists "stories_objects_update" on storage.objects;

drop policy if exists "stories_objects_delete" on storage.objects;
create policy "stories_objects_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ------------------------------------------------------------
-- 8) RPC da barra — stories vivos AGRUPADOS por autor, com "visto por mim".
--    SECURITY INVOKER de propósito (padrão): a RLS de stories continua
--    valendo dentro da função. Um SECURITY DEFINER seria mais rápido, mas
--    qualquer erro no JOIN de amizade viraria vazamento total da tabela.
--    profiles é lida via public_profiles (a view roda com os privilégios do
--    dono, então enxerga o perfil do amigo sem furar a RLS de profiles).
--
--    Ordem da barra: eu primeiro, depois não vistos, depois por recência.
-- ------------------------------------------------------------
create or replace function public.get_stories_feed()
returns table (
  author_id       uuid,
  nickname        text,
  tag             text,
  avatar_url      text,
  character_class text,
  character_skin  text,
  level           integer,
  is_me           boolean,
  has_unseen      boolean,
  story_count     integer,
  latest_at       timestamptz,
  stories         jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  with live as (
    select
      s.*,
      (s.user_id = (select auth.uid())) as is_mine,
      exists (
        select 1 from public.story_views v
         where v.story_id = s.id
           and v.viewer_id = (select auth.uid())
      ) as seen
    from public.stories s
    where s.expires_at > now()          -- a RLS já restringe a eu + amigos
  )
  select
    l.user_id,
    p.nickname,
    p.tag,
    p.avatar_url,
    p.character_class,
    p.character_skin,
    p.level,
    bool_or(l.is_mine)                        as is_me,
    bool_or(not l.seen and not l.is_mine)     as has_unseen,
    count(*)::int                             as story_count,
    max(l.created_at)                         as latest_at,
    jsonb_agg(
      jsonb_build_object(
        'id',              l.id,
        'imagePath',       l.image_path,
        'width',           l.width,
        'height',          l.height,
        'caption',         l.caption,
        'missionId',       l.mission_id,
        'missionTitle',    l.mission_title,
        'missionCategory', l.mission_category,
        'createdAt',       l.created_at,
        'expiresAt',       l.expires_at,
        'seen',            l.seen,
        -- contagem só faz sentido (e só é legível) para o dono
        'viewCount', case when l.is_mine then (
          select count(*) from public.story_views v2
           where v2.story_id = l.id and v2.viewer_id <> l.user_id
        ) else null end
      )
      order by l.created_at
    ) as stories
  from live l
  join public.public_profiles p on p.id = l.user_id
  group by l.user_id, p.nickname, p.tag, p.avatar_url,
           p.character_class, p.character_skin, p.level
  order by 8 desc, 9 desc, 11 desc
  limit 60;
$$;

revoke execute on function public.get_stories_feed() from public, anon;
grant execute on function public.get_stories_feed() to authenticated;

-- ------------------------------------------------------------
-- 9) Marcar como visto (em lote, ao fechar o visualizador).
--    INVOKER: a policy de insert de story_views é quem autoriza.
--    Não registra auto-visualização do próprio dono.
-- ------------------------------------------------------------
create or replace function public.mark_stories_viewed(p_story_ids uuid[])
returns integer language sql security invoker set search_path = public as $$
  with ins as (
    insert into public.story_views (story_id, viewer_id)
    select s.id, (select auth.uid())
      from public.stories s
     where s.id = any(p_story_ids)
       and s.expires_at > now()
       and s.user_id <> (select auth.uid())
    on conflict (story_id, viewer_id) do nothing
    returning 1
  )
  select count(*)::int from ins;
$$;

revoke execute on function public.mark_stories_viewed(uuid[]) from public, anon;
grant execute on function public.mark_stories_viewed(uuid[]) to authenticated;

-- Quem viu um story MEU (lista do dono).
create or replace function public.get_story_viewers(p_story_id uuid)
returns table (viewer_id uuid, nickname text, tag text, avatar_url text,
               character_class text, level integer, viewed_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select v.viewer_id, p.nickname, p.tag, p.avatar_url,
         p.character_class, p.level, v.viewed_at
    from public.story_views v
    join public.public_profiles p on p.id = v.viewer_id
   where v.story_id = p_story_id      -- RLS: só retorna se o story for meu
   order by v.viewed_at desc;
$$;

revoke execute on function public.get_story_viewers(uuid) from public, anon;
grant execute on function public.get_story_viewers(uuid) to authenticated;

-- ------------------------------------------------------------
-- 10) GC — arquivos.
--     REGRA DE OURO: `delete from storage.objects` em SQL NÃO apaga o arquivo
--     no S3, só a linha de metadados — o arquivo vira órfão e continua
--     contando na cota. Arquivo só some pela Storage API (`.remove()`).
--
--     Esta função devolve as chaves "mortas" da MINHA pasta: expiradas,
--     apagadas manualmente, ou órfãs de upload que falhou antes do insert.
--     O cliente chama e passa o resultado para storage.from('stories').remove().
--     A folga de 25h evita apagar um arquivo cujo insert ainda está em voo.
-- ------------------------------------------------------------
create or replace function public.list_my_stale_story_objects()
returns table (path text)
language sql stable security definer set search_path = public, storage as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'stories'
     and (storage.foldername(o.name))[1] = (select auth.uid())::text  -- trava de dono
     and o.created_at < now() - interval '25 hours'
     and not exists (
       select 1 from public.stories s
        where s.image_path = o.name
          and s.expires_at > now()
     )
   limit 200;
$$;

revoke execute on function public.list_my_stale_story_objects() from public, anon;
grant execute on function public.list_my_stale_story_objects() to authenticated;

-- ------------------------------------------------------------
-- 11) GC — linhas. pg_cron está disponível em qualquer plano; se a extensão
--     não estiver ligada, este bloco é no-op (a migração não quebra).
--     Só purga METADADO: o arquivo é responsabilidade do passo 10.
--     Guarda 2 dias de folga para não competir com o GC do cliente.
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'lvl2do-stories-purge') then
      perform cron.unschedule('lvl2do-stories-purge');
    end if;
    perform cron.schedule(
      'lvl2do-stories-purge',
      '17 * * * *',
      $job$ delete from public.stories where expires_at < now() - interval '2 days' $job$
    );
  end if;
exception when others then
  raise notice 'pg_cron indisponível — purga de stories fica a cargo do cliente';
end $$;

-- ------------------------------------------------------------
notify pgrst, 'reload schema';
