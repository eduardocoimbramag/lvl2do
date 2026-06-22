/**
 * /login — Autenticação real via Clerk (<SignIn />).
 *
 * Rota catch-all ([[...rest]]) exigida pelo componente <SignIn /> do Clerk
 * para lidar com as sub-rotas internas (verificação, fatores, etc.).
 */
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export default function LoginPage() {
  return (
    <>
      <AnimatedBackground />
      <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-soft"
        >
          <ArrowLeft size={16} /> Voltar ao início
        </Link>

        <SignIn signUpUrl="/register" fallbackRedirectUrl="/dashboard" />
      </main>
    </>
  );
}
