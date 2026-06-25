"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, Flame, Trophy, Zap, Trash2, type LucideIcon } from "lucide-react";
import { CountryFlag } from "./CountryFlag";
import { Button } from "./Button";
import { getCharacterImage } from "@/data/characterClasses";
import { getCountry, type Friend } from "@/data/social";
import { cn } from "@/lib/utils";

interface FriendProfileModalProps {
  /** amigo selecionado, ou null (fechado). */
  friend: Friend | null;
  onClose: () => void;
  onRemove: (id: string) => void;
}

/** Modal com o perfil do amigo: arte grande, classe, país e estatísticas. */
export function FriendProfileModal({ friend, onClose, onRemove }: FriendProfileModalProps) {
  return (
    <AnimatePresence>
      {friend && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Perfil de ${friend.name}`}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="card-surface relative w-full max-w-md overflow-hidden rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl sm:p-8"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand/20 blur-3xl" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-soft"
            >
              <X size={18} />
            </button>

            <div className="relative flex flex-col items-center text-center">
              {/* arte grande do personagem */}
              <div className="relative h-40 w-40 overflow-hidden rounded-3xl border border-white/10 bg-ink shadow-glow">
                <Image
                  src={getCharacterImage(friend.characterClass, friend.level)}
                  alt={friend.characterClass}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>

              <h2 className="mt-4 font-display text-xl font-bold text-soft">{friend.name}</h2>
              <p className="text-xs text-muted">@{friend.username}</p>

              <div className="mt-2 inline-flex items-center gap-2 text-sm">
                <span className="font-medium text-brand-light">{friend.characterClass}</span>
                <CountryFlag code={friend.country} />
                <span className="text-muted">{getCountry(friend.country)?.name}</span>
              </div>

              {/* estatísticas */}
              <div className="mt-5 grid w-full grid-cols-3 gap-3">
                <StatMini icon={Trophy} label="Nível" value={friend.level} />
                <StatMini icon={Flame} label="Streak" value={`${friend.streak}d`} tone="orange" />
                <StatMini
                  icon={Zap}
                  label="XP total"
                  value={friend.totalXp.toLocaleString("pt-BR")}
                />
              </div>

              {/* ações */}
              <div className="mt-6 flex w-full gap-3">
                <Button variant="secondary" className="flex-1" onClick={onClose}>
                  Fechar
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    onRemove(friend.id);
                    onClose();
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
                >
                  <Trash2 size={15} /> Remover amigo
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Mini-card de estatística usado dentro do modal. */
function StatMini({
  icon: Icon,
  label,
  value,
  tone = "brand",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: "brand" | "orange";
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <Icon
        size={16}
        className={cn("mx-auto", tone === "orange" ? "text-orange-400" : "text-brand-light")}
      />
      <p className="mt-1.5 font-display text-base font-bold text-soft tabular-nums">{value}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}
