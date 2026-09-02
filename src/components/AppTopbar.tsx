"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import { useAuth } from "./AuthProvider";

/** Topbar mobile das páginas internas (a sidebar fica oculta no mobile). */
export function AppTopbar() {
  const router = useRouter();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    // z-40 e não z-20: `sticky` + `z-index` cria contexto de empilhamento, então
    // o z-50 do painel de notificações é clampado ao z da header. Com z-20 ele
    // ficava ATRÁS da BottomNav (z-30). Header e BottomNav não se sobrepõem.
    <header data-app-topbar className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.06] bg-ink/80 px-5 backdrop-blur-xl md:hidden">
      <Logo size="sm" />
      <div className="flex items-center gap-1">
        <NotificationsBell align="end" />
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sair"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-white/5 hover:text-soft"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
