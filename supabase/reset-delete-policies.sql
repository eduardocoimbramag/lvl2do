-- ============================================================
-- lvl2do — policies de DELETE p/ o "master reset" funcionar via cliente
-- ============================================================
-- O botão "Resetar conta (dev)" apaga os dados do PRÓPRIO usuário. Com RLS
-- ativo, o cliente só pode deletar se houver uma policy `for delete`. Hoje só
-- `missions` tem — este script adiciona as demais (cada usuário só apaga as
-- próprias linhas). Idempotente.
--
-- Rode TODO este bloco no SQL Editor do Supabase.
-- ============================================================

-- xp_events
drop policy if exists "xp_events_delete_own" on public.xp_events;
create policy "xp_events_delete_own" on public.xp_events
  for delete using (auth.uid() = user_id);

-- redemptions
drop policy if exists "redemptions_delete_own" on public.redemptions;
create policy "redemptions_delete_own" on public.redemptions
  for delete using (auth.uid() = user_id);

-- friendships (participa como user_id OU friend_id)
drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own" on public.friendships
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- referrals (participa como referrer OU referred)
drop policy if exists "referrals_delete_own" on public.referrals;
create policy "referrals_delete_own" on public.referrals
  for delete using (auth.uid() = referrer_id or auth.uid() = referred_id);

-- recarrega o cache do PostgREST (boa prática após mudar policies)
notify pgrst, 'reload schema';
