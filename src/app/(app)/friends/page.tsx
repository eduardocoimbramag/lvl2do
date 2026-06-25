"use client";

import { useMemo, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { FriendCard } from "@/components/FriendCard";
import { FriendProfileModal } from "@/components/FriendProfileModal";
import { AddFriendModal } from "@/components/AddFriendModal";
import { AnimatedGrid } from "@/components/Section";
import { MOCK_FRIENDS, MOCK_SUGGESTED, type Friend } from "@/data/social";

/**
 * Sistema de amigos (mock, sem persistência).
 * Adicionar/remover altera apenas o estado local — integrar com backend depois.
 */
export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [selected, setSelected] = useState<Friend | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // sugeridos que ainda não são amigos
  const candidates = useMemo(() => {
    const ids = new Set(friends.map((f) => f.id));
    return MOCK_SUGGESTED.filter((s) => !ids.has(s.id));
  }, [friends]);

  function addFriend(f: Friend) {
    setFriends((prev) => (prev.some((x) => x.id === f.id) ? prev : [f, ...prev]));
  }
  function removeFriend(id: string) {
    setFriends((prev) => prev.filter((f) => f.id !== id));
  }

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

      {friends.length > 0 ? (
        <AnimatedGrid className="grid gap-4 sm:grid-cols-2">
          {friends.map((f) => (
            <FriendCard
              key={f.id}
              friend={f}
              onView={() => setSelected(f)}
              onRemove={() => removeFriend(f.id)}
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
        onRemove={removeFriend}
      />
      <AddFriendModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        candidates={candidates}
        onAdd={addFriend}
      />
    </>
  );
}
