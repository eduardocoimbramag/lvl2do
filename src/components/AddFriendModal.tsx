"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Search, UserPlus, UserX, Loader2 } from "lucide-react";
import { CharacterAvatar } from "./CharacterAvatar";
import { CountryFlag } from "./CountryFlag";
import type { Friend } from "@/data/social";

interface AddFriendModalProps {
  open: boolean;
  onClose: () => void;
  /** busca jogadores por nickname (ou "Nick#TAG"). */
  search: (q: string) => Promise<Friend[]>;
  /** adiciona o jogador (persiste). */
  onAdd: (friend: Friend) => Promise<void> | void;
  /** ids a ocultar dos resultados (você + amigos atuais). */
  excludeIds: string[];
}

/** Modal de busca e adição de amigos (busca real no banco). */
export function AddFriendModal({ open, onClose, search, onAdd, excludeIds }: AddFriendModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  // limpa ao fechar
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // busca com debounce
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let active = true;
    const t = setTimeout(() => {
      search(q)
        .then((rows) => {
          if (active) setResults(rows);
        })
        .catch((e) => {
          console.error("Erro na busca de jogadores:", e);
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, search]);

  const filtered = useMemo(
    () => results.filter((r) => !excludeIds.includes(r.id)),
    [results, excludeIds],
  );

  async function handleAdd(friend: Friend) {
    setAdding(friend.id);
    try {
      await onAdd(friend);
    } catch (e) {
      console.error("Erro ao adicionar amigo:", e);
    } finally {
      setAdding(null);
    }
  }

  return (
    <AnimatePresence>
      {open && (
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
            aria-label="Adicionar amigo"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="card-surface relative flex max-h-[85vh] w-full max-w-md flex-col rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-soft">Adicionar amigo</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-soft"
              >
                <X size={18} />
              </button>
            </div>

            {/* busca */}
            <div className="relative mb-4">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nickname ou Nick#TAG"
                className="w-full rounded-xl border border-white/10 bg-ink py-2.5 pl-10 pr-4 text-sm text-soft placeholder:text-muted/60 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>

            {/* lista de resultados */}
            <div className="-mr-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
              {loading ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Loader2 size={24} className="animate-spin text-brand-light" />
                  <p className="text-sm text-muted">Buscando…</p>
                </div>
              ) : filtered.length > 0 ? (
                filtered.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <CharacterAvatar characterClass={c.characterClass} level={c.level} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-soft">{c.name}</p>
                      <p className="truncate text-xs text-muted">
                        Nível {c.level} · {c.characterClass}
                      </p>
                    </div>
                    <CountryFlag code={c.country} />
                    <button
                      type="button"
                      onClick={() => handleAdd(c)}
                      disabled={adding === c.id}
                      aria-label={`Adicionar ${c.name}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white shadow-glow-sm transition-all hover:brightness-110 disabled:opacity-60"
                    >
                      {adding === c.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <UserPlus size={14} />
                      )}
                      Adicionar
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <UserX size={28} className="text-muted" />
                  <p className="text-sm text-muted">
                    {query.trim().length < 2
                      ? "Digite ao menos 2 caracteres para buscar."
                      : "Nenhum jogador encontrado."}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
