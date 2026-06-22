/**
 * /register — Cadastro real via Clerk (<SignUp />).
 *
 * Rota catch-all ([[...rest]]) exigida pelo componente <SignUp /> do Clerk
 * para lidar com as sub-rotas internas (verificação de e-mail, etc.).
 */
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export default function RegisterPage() {
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

        <SignUp signInUrl="/login" fallbackRedirectUrl="/dashboard" />
      </main>
    </>
  );
}
