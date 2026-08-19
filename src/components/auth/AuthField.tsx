"use client";

import type { LucideIcon } from "lucide-react";

/**
 * Campo das telas de autenticação: caixa com ícone à esquerda e o input (mais
 * eventuais ações, como o olho de "mostrar senha") como filhos.
 * Fonte única do visual usado em /login, /register, /forgot-password e
 * /reset-password.
 */
export function AuthField({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-ink px-3.5 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/30">
      <Icon size={16} className="shrink-0 text-muted" />
      {children}
    </div>
  );
}

/** Classe padrão dos <input> dentro de <AuthField>. */
export const authInputClass =
  "w-full bg-transparent py-2.5 text-sm text-soft placeholder:text-muted/60 focus:outline-none";
