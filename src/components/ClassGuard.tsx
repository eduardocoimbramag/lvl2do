"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useCharacterClass } from "@/hooks/useCharacterClass";

/**
 * Garante que o usuário escolheu uma classe antes de usar o app.
 * Quem está logado SEM classe é redirecionado para /onboarding.
 * Enquanto o Clerk carrega (ou durante o redirecionamento), segura o conteúdo
 * para evitar um flash do dashboard antes da escolha.
 */
export function ClassGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, needsClassSelection } = useCharacterClass();

  useEffect(() => {
    if (needsClassSelection) router.replace("/onboarding");
  }, [needsClassSelection, router]);

  // Carregando o usuário, ou prestes a redirecionar para a seleção de classe.
  if (!isLoaded || needsClassSelection) {
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
