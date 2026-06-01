"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { appNav } from "@/data/navigation";
import { cn } from "@/lib/utils";

/** Navegação inferior funcional no mobile (substitui a sidebar). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-ink-card/90 backdrop-blur-xl md:hidden">
      <div className="flex items-stretch justify-around">
        {appNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              {active && (
                <motion.span
                  layoutId="bottomnav-active"
                  className="absolute -top-px h-0.5 w-10 rounded-full bg-brand-gradient"
                />
              )}
              <item.icon
                size={20}
                className={cn(
                  "transition-colors",
                  active ? "text-brand-light" : "text-muted",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  active ? "text-soft" : "text-muted",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
