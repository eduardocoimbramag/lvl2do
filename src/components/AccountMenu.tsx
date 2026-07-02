"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { User, Settings, LogOut, ChevronsUpDown } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { cn } from "@/lib/utils";

interface AccountMenuProps {
  /** abre o modal de Configurações (controlado pela Sidebar). */
  onOpenSettings: () => void;
}

/**
 * Menu do usuário na sidebar: clicar no card (avatar + nome) abre um pequeno
 * menu com Perfil, Configurações e Sair. Fecha ao clicar fora ou Esc.
 */
export function AccountMenu({ onOpenSettings }: AccountMenuProps) {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.nickname || profile?.name || user?.email || "Conta";
  const initial = displayName.charAt(0).toUpperCase();

  // fecha ao clicar fora ou Esc
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div ref={containerRef} className="relative">
      {/* gatilho: card do usuário */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-colors hover:border-brand/30 hover:bg-white/[0.04]",
          open && "border-brand/30 bg-white/[0.04]",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient font-display text-sm font-bold text-white">
          {initial}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-soft">
          {displayName}
          {profile?.tag && <span className="text-muted">#{profile.tag}</span>}
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-muted" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="absolute bottom-full left-0 z-50 mb-2 w-full origin-bottom overflow-hidden rounded-2xl border border-white/10 bg-ink-card shadow-glow"
          >
            <div className="p-1.5">
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-soft transition-colors hover:bg-white/5"
              >
                <User size={16} className="text-muted" /> Perfil
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-soft transition-colors hover:bg-white/5"
              >
                <Settings size={16} className="text-muted" /> Configurações
              </button>

              <div className="my-1 h-px bg-white/[0.06]" />

              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-soft"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
