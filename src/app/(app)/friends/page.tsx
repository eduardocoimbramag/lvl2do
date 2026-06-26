"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus, Users, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { FriendCard } from "@/components/FriendCard";
import { FriendProfileModal } from "@/components/FriendProfileModal";
import { AddFriendModal } from "@/components/AddFriendModal";
import { AnimatedGrid } from "@/components/Section";
import { useAuth } from "@/components/AuthProvider";
import { getFriends, searchProfiles, addFriend, removeFriend } from "@/lib/db/social";
import type { Friend } from "@/data/social";

/**
 * Sistema de amigos (real, persistido no Supabase).
 * Busca por nickname#TAG, adiciona (amizade mútua) e remove via RPC.
 */
export default function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Friend | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // carrega os amigos do usuário
  useEffect(() => {
    if (!user) return;
    let active = true;
    getFriends()
      .then((rows) => {
        if (active) setFriends(rows);
      })
      .catch((e) => console.error("Erro ao carregar amigos:", e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  // ids ocultados na busca: você + amigos atuais
  const excludeIds = useMemo(
    () => [user?.id ?? "", ...friends.map((f) => f.id)],
    [user, friends],
  );

  const handleAdd = useCallback(async (friend: Friend) => {
    await addFriend(friend.id);
    setFriends((prev) => (prev.some((x) => x.id === friend.id) ? prev : [friend, ...prev]));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    removeFriend(id).catch((e) => {
      console.error("Erro ao remover amigo:", e);
      // recarrega em caso de falha
      getFriends().then(setFriends).catch(() => {});
    });
  }, []);

  return (
    <>
      <PageHeader
        title="Amigos"
        subtitle="Acompanhe a evolução de quem joga com você."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus size={16} /> Adicionar amigo
          </Button>
        }
      />

      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-muted">
        <Users size={13} className="text-brand-light" />
        {friends.length} {friends.length === 1 ? "amigo" : "amigos"}
      </div>

      {loading ? (
        <div className="card-surface flex flex-col items-center gap-3 p-12 text-center">
          <Loader2 className="animate-spin text-brand-light" size={28} />
          <p className="text-sm text-muted">Carregando amigos…</p>
        </div>
      ) : friends.length > 0 ? (
        <AnimatedGrid className="grid gap-4 sm:grid-cols-2">
          {friends.map((f) => (
            <FriendCard
              key={f.id}
              friend={f}
              onView={() => setSelected(f)}
              onRemove={() => handleRemove(f.id)}
            />
          ))}
        </AnimatedGrid>
      ) : (
        <div className="card-surface flex flex-col items-center gap-3 p-12 text-center">
          <Users className="text-brand-light" size={32} />
          <p className="text-sm text-muted">Você ainda não tem amigos. Adicione o primeiro!</p>
          <Button variant="secondary" onClick={() => setAddOpen(true)}>
            <UserPlus size={16} /> Adicionar amigo
          </Button>
        </div>
      )}

      <FriendProfileModal
        friend={selected}
        onClose={() => setSelected(null)}
        onRemove={handleRemove}
      />
      <AddFriendModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        search={searchProfiles}
        onAdd={handleAdd}
        excludeIds={excludeIds}
      />
    </>
  );
}
