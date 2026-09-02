"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { primaryNav } from "@/data/navigation";
import { cn } from "@/lib/utils";

/** Navegação inferior funcional no mobile (substitui a sidebar). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav data-app-bottomnav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-ink-card/90 backdrop-blur-xl md:hidden">
      <div className="flex items-stretch justify-around">
        {primaryNav.map((item) => {
          const active = pathname === item.href && !item.disabled;
          const base = "relative flex flex-1 flex-col items-center gap-1 py-2.5";

          const conteudo = (
            <>
              {active && (
                <motion.span
                  layoutId="bottomnav-active"
                  className="absolute -top-px h-0.5 w-10 rounded-full bg-brand-gradient"
                />
              )}
              <item.icon
                size={20}
                className={cn("transition-colors", active ? "text-brand-light" : "text-muted")}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  active ? "text-soft" : "text-muted",
                )}
              >
                {item.shortLabel ?? item.label}
              </span>
            </>
          );

          // Mesmo tratamento da sidebar: <span> em vez de <Link>, para não
          // navegar nem receber foco. Aqui não cabe o selo "Em breve" (o
          // rótulo tem 10px), então o estado é comunicado pela opacidade e
          // pelo aria-disabled.
          if (item.disabled) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                className={cn(base, "cursor-not-allowed opacity-40")}
              >
                {conteudo}
              </span>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={base}>
              {conteudo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
