"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import { useAuth } from "./AuthProvider";
import { appNav } from "@/data/navigation";
import { cn } from "@/lib/utils";

/**
 * Sidebar fixa das páginas internas (desktop/tablet).
 * No mobile é substituída pela navegação inferior (ver BottomNav).
 */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.nickname || profile?.name || user?.email || "Conta";

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.06] bg-ink-card/60 backdrop-blur-xl md:flex lg:w-72">
      <div className="flex h-16 items-center px-6">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        {appNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                active ? "text-soft" : "text-muted hover:text-soft",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 -z-10 rounded-xl border border-brand/30 bg-brand/10 shadow-glow-sm"
                  transition={{ type: "spring", damping: 26, stiffness: 300 }}
                />
              )}
              <item.icon
                size={18}
                className={cn("transition-colors", active ? "text-brand-light" : "")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Card de usuário — avatar (inicial) + nome + sino + sair */}
      <div className="space-y-2 border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient font-display text-sm font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-soft">
            {displayName}
            {profile?.tag && <span className="text-muted">#{profile.tag}</span>}
          </span>
          <NotificationsBell />
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-soft"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </aside>
  );
}
