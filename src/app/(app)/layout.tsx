/**
 * Layout das páginas internas do app: /dashboard, /missions, /progress, /profile.
 *
 * ⚠️ PROTEÇÃO DE ROTA (FUTURO):
 * Estas rotas ficarão acessíveis por enquanto, SEM proteção.
 * Futuramente serão protegidas com Clerk Middleware (middleware.ts),
 * usando o matcher para /dashboard, /missions, /progress e /profile.
 */
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { AppTopbar } from "@/components/AppTopbar";
import { GlobalXpToast } from "@/components/GlobalXpToast";
import { ClassGuard } from "@/components/ClassGuard";
import { AppStateProvider } from "@/hooks/AppStateProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // Estado global (missões + XP) compartilhado por todas as páginas internas.
    <AppStateProvider>
      {/* Garante a escolha de classe no primeiro login antes de exibir o app. */}
      <ClassGuard>
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
        </div>
      </ClassGuard>
    </AppStateProvider>
  );
}
