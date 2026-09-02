"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, CheckCheck, Info, CheckCircle2, AlertTriangle, X, type LucideIcon } from "lucide-react";
import { useAppNotifications } from "@/hooks/AppStateProvider";
import type { NotificationType } from "@/data/types";
import { cn } from "@/lib/utils";

/** Ícone por tipo de notificação. */
const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  info: "text-brand-light",
  success: "text-success",
  warning: "text-amber-300",
};

/** Formata uma data ISO como "12/06 14:30". */
function formatWhen(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Sino de notificações com popover ancorado. Abre uma caixa (acima do sino)
 * listando as notificações; fecha ao clicar fora. A lista começa vazia — o
 * sistema que gera notificações será plugado depois (ver useNotifications).
 */
interface NotificationsBellProps {
  /**
   * Lado do sino em que o painel se alinha.
   * "start" (padrão) serve a sidebar, onde o sino fica à esquerda da tela.
   * "end" é obrigatório na topbar mobile: lá o sino encosta na borda direita,
   * e alinhar pelo início jogaria 200px do painel para fora da viewport —
   * criando inclusive rolagem horizontal na página inteira.
   */
  align?: "start" | "end";
}

export function NotificationsBell({ align = "start" }: NotificationsBellProps = {}) {
  const { notifications, unreadCount, markAllRead, removeNotification, clearAll } =
    useAppNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // fecha ao clicar fora ou pressionar Esc
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

  // ao abrir, marca as notificações como lidas
  useEffect(() => {
    if (open && unreadCount > 0) markAllRead();
  }, [open, unreadCount, markAllRead]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        aria-expanded={open}
        className={cn(
          "relative rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-soft",
          open && "bg-white/5 text-soft",
        )}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            // Abre ABAIXO do sino (ele mora no topo, tanto na sidebar quanto na
            // topbar). A largura é limitada à viewport para nunca vazar em telas
            // estreitas — o padding lateral do container é de 20px por lado.
            className={cn(
              "absolute top-full z-50 mt-2 w-[min(18rem,calc(100vw_-_2.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-ink-card shadow-glow",
              align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left",
            )}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h3 className="font-display text-sm font-semibold text-soft">Notificações</h3>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-soft"
                >
                  <CheckCheck size={13} /> Limpar
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <BellOff size={26} className="text-muted" />
                  <p className="text-sm text-muted">Nenhuma notificação ainda.</p>
                  <p className="max-w-[14rem] text-xs text-muted/70">
                    Suas notificações aparecerão aqui.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {notifications.map((n) => {
                    const Icon = TYPE_ICON[n.type];
                    return (
                      <li
                        key={n.id}
                        className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
                      >
                        <Icon size={16} className={cn("mt-0.5 shrink-0", TYPE_COLOR[n.type])} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-soft">{n.title}</p>
                          {n.description && (
                            <p className="mt-0.5 text-xs text-muted">{n.description}</p>
                          )}
                          <p className="mt-1 text-[11px] text-muted/70">{formatWhen(n.createdAt)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNotification(n.id)}
                          aria-label="Remover notificação"
                          className="shrink-0 rounded-md p-1 text-muted opacity-0 transition-all hover:text-soft group-hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
