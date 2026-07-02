/**
 * Layout das páginas internas do app (/dashboard, /missions, /progress, ...).
 *
 * Autenticação: protegida pelo middleware do Supabase (exige login).
 * Guards client-side, nesta ordem:
 *   AppStateProvider → ClassGuard (onboarding/classe) → AccessGuard (assinatura/
 *   cristal/dev) → layout interno (Sidebar/BottomNav/children).
 * Assim: sem onboarding → /onboarding; com onboarding mas sem acesso → /paywall;
 * com acesso → app.
 */
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { AppTopbar } from "@/components/AppTopbar";
import { GlobalXpToast } from "@/components/GlobalXpToast";
import { ClassGuard } from "@/components/ClassGuard";
import { AccessGuard } from "@/components/AccessGuard";
import { AlarmScheduler } from "@/components/AlarmScheduler";
import { AppStateProvider } from "@/hooks/AppStateProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // Estado global (missões + XP) compartilhado por todas as páginas internas.
    <AppStateProvider>
      {/* Garante a escolha de classe no primeiro login antes de exibir o app. */}
      <ClassGuard>
        {/* Garante acesso (assinatura/cristal/dev) antes de exibir o app. */}
        <AccessGuard>
          <div className="min-h-screen">
            <AnimatedBackground />
            <Sidebar />
            <AppTopbar />

            {/* conteúdo deslocado pela sidebar no desktop, com espaço pra bottom nav no mobile */}
            <div className="md:pl-64 lg:pl-72">
              <main className="container-page py-6 pb-24 sm:py-8 md:pb-10">{children}</main>
            </div>

            <BottomNav />

            {/* feedback de XP (ganho/perda) visível em qualquer página */}
            <GlobalXpToast />

            {/* motor de disparo dos alarmes (sem UI) — toca som + notifica no horário */}
            <AlarmScheduler />
          </div>
        </AccessGuard>
      </ClassGuard>
    </AppStateProvider>
  );
}
