"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import { AccountMenu } from "./AccountMenu";
import { SettingsModal } from "./SettingsModal";
import { appNav } from "@/data/navigation";
import { cn } from "@/lib/utils";

/**
 * Sidebar fixa das páginas internas (desktop/tablet).
 * No mobile é substituída pela navegação inferior (ver BottomNav).
 */
export function Sidebar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

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

      {/* Rodapé — sino de notificações + menu do usuário */}
      <div className="border-t border-white/[0.06] p-4">
        <div className="mb-2 flex justify-end">
          <NotificationsBell />
        </div>
        <AccountMenu onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </aside>
  );
}
