"use client";

import { motion } from "framer-motion";
import { Flame, Trash2, ChevronRight } from "lucide-react";
import { CharacterAvatar } from "./CharacterAvatar";
import { CountryFlag } from "./CountryFlag";
import { Button } from "./Button";
import { fadeUp } from "@/lib/animations";
import type { Friend } from "@/data/social";

interface FriendCardProps {
  friend: Friend;
  onView: () => void;
  onRemove: () => void;
}

/** Card de um amigo: miniatura do personagem, dados e ações. */
export function FriendCard({ friend, onView, onRemove }: FriendCardProps) {
  return (
    <motion.div variants={fadeUp} className="card-glow group flex items-center gap-4 p-4">
      <button
        type="button"
        onClick={onView}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <CharacterAvatar characterClass={friend.characterClass} level={friend.level} size="md" />
        <div className="min-w-0">
          <p className="truncate font-display font-semibold text-soft">{friend.name}</p>
          <p className="truncate text-xs text-muted">@{friend.username}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-brand-light">{friend.characterClass}</span>
            <span className="text-muted/40">•</span>
            <span className="inline-flex items-center gap-1 text-orange-400">
              <Flame size={12} fill="currentColor" /> {friend.streak}
            </span>
            <CountryFlag code={friend.country} />
          </div>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onView} className="hidden sm:inline-flex">
          Ver perfil <ChevronRight size={14} />
        </Button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover ${friend.name}`}
          className="rounded-lg border border-white/10 bg-white/5 p-2 text-muted transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </motion.div>
  );
}
