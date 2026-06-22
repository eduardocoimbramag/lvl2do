"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { motion } from "framer-motion";
import { Show, UserButton } from "@clerk/nextjs";
import { Logo } from "./Logo";
import { ButtonLink } from "./Button";
import { MobileMenu } from "./MobileMenu";
import { landingNav } from "@/data/navigation";
import { cn } from "@/lib/utils";

/** Header da landing page com nav desktop + menu mobile. */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-all duration-300",
          scrolled
            ? "border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl"
            : "bg-transparent",
        )}
      >
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />

          <nav className="hidden items-center gap-1 md:flex">
            {landingNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-soft"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Show when="signed-out">
              <ButtonLink href="/login" variant="ghost" size="sm">
                Entrar
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Registre-se
              </ButtonLink>
            </Show>
            <Show when="signed-in">
              <ButtonLink href="/dashboard" variant="ghost" size="sm">
                Dashboard
              </ButtonLink>
              <UserButton />
            </Show>
          </div>

          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            className="rounded-lg p-2 text-soft transition-colors hover:bg-white/5 md:hidden"
          >
            <Menu size={22} />
          </button>
        </div>
      </motion.header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
