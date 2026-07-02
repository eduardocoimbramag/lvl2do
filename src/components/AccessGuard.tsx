"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useAccessGate } from "@/hooks/useAccessGate";

/**
 * Guard de ACESSO das rotas internas do app. Usado dentro de (app)/layout,
 * DEPOIS do ClassGuard (que garante onboarding/classe).
 *
 * - loading → segura o conteúdo com um loader (não mostra o app antes de decidir).
 * - com acesso (assinatura / cristal do dia / dev bypass) → renderiza children.
 * - sem acesso → redireciona para /paywall?next=<rota-atual>.
 *
 * Evita loop: as rotas internas ficam em (app); /paywall está fora, então o
 * guard nunca roda lá. Ainda assim, não redirecionamos se já estivermos em
 * /paywall (defensivo).
 */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, hasAccess } = useAccessGate();

  useEffect(() => {
    if (loading || hasAccess) return;
    if (pathname === "/paywall") return; // defensivo — evita loop
    const next = encodeURIComponent(pathname || "/dashboard");
    router.replace(`/paywall?next=${next}`);
  }, [loading, hasAccess, pathname, router]);

  // carregando a decisão, ou prestes a redirecionar para o paywall
  if (loading || !hasAccess) {
    return (
      <>
        <AnimatedBackground />
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="animate-spin text-muted" size={28} />
        </main>
      </>
    );
  }

  return <>{children}</>;
}
