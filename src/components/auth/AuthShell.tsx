"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

/**
 * Moldura das telas de autenticação: fundo animado, link de volta e o cartão
 * centralizado. Mantém /login, /forgot-password e /reset-password idênticas.
 */
export function AuthShell({
  backHref = "/",
  backLabel = "Voltar ao início",
  children,
}: {
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <AnimatedBackground />
      <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
        <Link
          href={backHref}
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-soft"
        >
          <ArrowLeft size={16} /> {backLabel}
        </Link>

        <div className="card-surface w-full max-w-sm p-7 sm:p-8 shadow-glow">{children}</div>
      </main>
    </>
  );
}
