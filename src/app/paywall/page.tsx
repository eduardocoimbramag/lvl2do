"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { PaywallPageShell } from "@/components/paywall/PaywallPageShell";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { useAccessGate } from "@/hooks/useAccessGate";

/**
 * /paywall — etapa de assinatura após o onboarding.
 *
 * Rota FORA de (app): não tem sidebar/bottom nav. O middleware já exige login.
 * Redirecionamentos (sem loops):
 * - onboarding incompleto (sem classe) → /onboarding
 * - já tem acesso (assinatura/cristal/dev) → /dashboard (ou ?next)
 * - caso contrário → mostra o paywall.
 */
export default function PaywallPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, needsClassSelection } = useCharacterClass();
  const { loading: accessLoading, hasAccess } = useAccessGate();

  const loading = !isLoaded || accessLoading;

  useEffect(() => {
    if (loading) return;
    if (!isSignedIn) {
      router.replace("/login");
      return;
    }
    // ainda não concluiu o onboarding (sem classe/nickname) → volta ao onboarding
    if (needsClassSelection) {
      router.replace("/onboarding");
      return;
    }
    // já tem acesso → vai para o destino pretendido (ou dashboard)
    if (hasAccess) {
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    }
  }, [loading, isSignedIn, needsClassSelection, hasAccess, router]);

  // enquanto carrega ou vai redirecionar (sem classe / com acesso), segura o conteúdo
  if (loading || !isSignedIn || needsClassSelection || hasAccess) {
    return (
      <>
        <AnimatedBackground />
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="animate-spin text-muted" size={28} />
        </main>
      </>
    );
  }

  return <PaywallPageShell />;
}
