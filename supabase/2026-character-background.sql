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
