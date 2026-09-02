"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import { AccountMenu } from "./AccountMenu";
import { CurrencyBalance } from "./CurrencyBalance";
import { appNav } from "@/data/navigation";
import { cn } from "@/lib/utils";

/**
 * Sidebar fixa das páginas internas (desktop/tablet).
 * No mobile é substituída pela navegação inferior (ver BottomNav).
 */
export function Sidebar() {
  const pathname = usePathname();
  const activeRef = useRef<HTMLElement | null>(null);
  // callback ref: o item ativo pode ser um <a> (navegável) ou um <span>
  // (desativado), e um RefObject tipado num deles não serve no outro.
  const setActiveRef = (el: HTMLElement | null) => {
    activeRef.current = el;
  };

  /**
   * Traz o item ativo para a vista.
   *
   * A navegação virou um container rolável (11 itens não cabem em viewport
   * baixo). Num link direto para a última aba, ela monta com scrollTop 0 e o
   * item ativo — junto com o indicador — nasce fora da área visível: o usuário
   * fica sem nenhuma marca de onde está. `block: "nearest"` só rola se
   * precisar, então não mexe na tela quando o item já está visível.
   */
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.06] bg-ink-card/60 backdrop-blur-xl md:flex lg:w-72">
      {/* topo: logo + sino, alinhados na mesma linha */}
      <div className="flex h-16 items-center justify-between gap-2 px-6">
        <Logo />
        <NotificationsBell />
      </div>

      {/* min-h-0 é o que permite o filho de um flex encolher e rolar; sem ele
          o overflow-y-auto não tem efeito. no-scrollbar mantém o visual. */}
      <nav className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {appNav.map((item) => {
          const active = pathname === item.href;
          const base =
            "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors";

          const conteudo = (
            <>
              {active && !item.disabled && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 -z-10 rounded-xl border border-brand/30 bg-brand/10 shadow-glow-sm"
                  transition={{ type: "spring", damping: 26, stiffness: 300 }}
                />
              )}
              <item.icon
                size={18}
                className={cn("transition-colors", active && !item.disabled ? "text-brand-light" : "")}
              />
              {item.label}
              {item.badge && (
                <span className="ml-auto shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {item.badge}
                </span>
              )}
            </>
          );

          // Item desativado vira <span>: sem href, fora da ordem de tabulação e
          // anunciado como desabilitado — um <Link> com pointer-events-none
          // continuaria focável e navegável por teclado.
          if (item.disabled) {
            return (
              <span
                key={item.href}
                ref={active ? setActiveRef : undefined}
                role="link"
                aria-disabled="true"
                className={cn(base, "cursor-not-allowed text-muted/75")}
              >
                {conteudo}
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              ref={active ? setActiveRef : undefined}
              href={item.href}
              className={cn(base, active ? "text-soft" : "text-muted hover:text-soft")}
            >
              {conteudo}
            </Link>
          );
        })}
      </nav>

      {/* Saldos — acima da divisória do rodapé. `shrink-0` impede que sejam
          espremidos quando a navegação precisa rolar. */}
      <div className="shrink-0 px-4 pb-3">
        <CurrencyBalance />
      </div>

      {/* Rodapé — menu do usuário */}
      <div className="shrink-0 border-t border-white/[0.06] p-4">
        <AccountMenu />
      </div>
    </aside>
  );
}
