"use client";

import { motion } from "framer-motion";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { PaywallModal } from "./PaywallModal";

/**
 * Tela full-screen do paywall (sem sidebar/bottom nav). Centraliza o
 * PaywallModal e apresenta uma frase de contexto — a etapa natural logo após
 * criar o personagem no onboarding.
 */
export function PaywallPageShell() {
  return (
    <>
      <AnimatedBackground />
      <main className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 max-w-md text-center text-sm text-muted"
        >
          Seu personagem está pronto. Agora escolha como deseja continuar sua jornada.
        </motion.p>

        <PaywallModal />
      </main>
    </>
  );
}
