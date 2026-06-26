"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Logo } from "./Logo";
import { ButtonLink } from "./Button";
import { landingNav } from "@/data/navigation";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

/** Drawer de navegação mobile da landing page. */
export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const { user } = useAuth();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            aria-label="Fechar menu"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.nav
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="absolute right-0 top-0 flex h-full w-[78%] max-w-xs flex-col border-l border-white/10 bg-ink-card/95 p-6 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <Logo />
              <button
                onClick={onClose}
                aria-label="Fechar menu"
                className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-soft"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-8 flex flex-col gap-1">
              {landingNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-soft"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-6">
              {user ? (
                <ButtonLink href="/dashboard" className="w-full" onClick={onClose}>
                  Ir para o Dashboard
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/login" variant="secondary" className="w-full" onClick={onClose}>
                    Entrar
                  </ButtonLink>
                  <ButtonLink href="/register" className="w-full" onClick={onClose}>
                    Registre-se
                  </ButtonLink>
                </>
              )}
            </div>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
