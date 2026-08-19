-- ============================================================
-- lvl2do — fundo do personagem (aba Perfil > "Trocar fundo")
-- Rode no SQL Editor do Supabase (idempotente).
-- Depende de: schema.sql (profiles).
--
-- Guarda só o IDENTIFICADOR do fundo. A arte é vetorial, montada no cliente
-- (src/components/CharacterBackdrop.tsx) — nada de URL nem de arquivo aqui.
-- 'none' = moldura preta padrão.
-- ============================================================

alter table public.profiles
  add column if not exists character_background text not null default 'none';

-- Validação no banco também: o cliente escolhe de uma lista fechada, mas a
-- coluna é gravável por PATCH direto no PostgREST. Sem o check, qualquer texto
-- entraria e o app cairia no fallback silenciosamente para sempre.
alter table public.profiles
  drop constraint if exists profiles_character_background_valid;
alter table public.profiles
  add constraint profiles_character_background_valid
  check (character_background in ('none', 'castelo', 'trono', 'floresta'));

-- ------------------------------------------------------------
notify pgrst, 'reload schema';

-- ============================================================
-- Propagação do fundo para o SOCIAL.
-- Depende de: 2026-social.sql (public_profiles) e 2026-stories.sql
-- (get_stories_feed). Rode DEPOIS dos dois.
--
-- A miniatura do story mostra o cenário de CADA autor, então o fundo precisa
-- viajar junto do perfil público e do feed de stories.
-- ============================================================

-- 1) view pública: expõe o fundo (é preferência cosmética, não dado sensível).
create or replace view public.public_profiles as
  select id, nickname, tag, avatar_url, character_class, character_skin,
         character_background, level, total_xp, year_xp,
         current_streak, best_streak, country
  from public.profiles;

grant select on public.public_profiles to authenticated;

-- 2) feed de stories: acrescenta character_background ao retorno.
--    `create or replace` não aceita mudar a assinatura de retorno — por isso
--    o drop antes. É seguro: nenhuma view depende desta função.
drop function if exists public.get_stories_feed();

create or replace function public.get_stories_feed()
returns table (
  author_id            uuid,
  nickname             text,
  tag                  text,
  avatar_url           text,
  character_class      text,
  character_skin       text,
  character_background text,
  level                integer,
  is_me                boolean,
  has_unseen           boolean,
  story_count          integer,
  latest_at            timestamptz,
  stories              jsonb
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
    p.character_background,
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
           p.character_class, p.character_skin, p.character_background, p.level
  order by 9 desc, 10 desc, 12 desc
  limit 60;
$$;

revoke execute on function public.get_stories_feed() from public, anon;
grant execute on function public.get_stories_feed() to authenticated;

-- ------------------------------------------------------------
notify pgrst, 'reload schema';
