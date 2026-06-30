"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

/** /login — autenticação por e-mail + senha (Supabase Auth). */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    const redirect =
      new URLSearchParams(window.location.search).get("redirect") || "/dashboard";
    router.replace(redirect);
    router.refresh();
  }

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

        <div className="card-surface w-full max-w-sm p-7 sm:p-8 shadow-glow">
          <div className="flex flex-col items-center text-center">
            <Logo size="lg" href={undefined} />
            <h1 className="mt-5 font-display text-2xl font-bold text-soft">Entrar</h1>
            <p className="mt-1 text-sm text-muted">Continue sua jornada de evolução.</p>
          </div>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <Field icon={Mail}>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-transparent py-2.5 text-sm text-soft placeholder:text-muted/60 focus:outline-none"
              />
            </Field>
            <Field icon={Lock}>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                className="w-full bg-transparent py-2.5 text-sm text-soft placeholder:text-muted/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                className="shrink-0 rounded-md p-1 text-muted transition-colors hover:text-soft"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </Field>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Não tem conta?{" "}
            <Link href="/register" className="font-medium text-brand-light hover:text-brand-vivid">
              Registre-se
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}

function Field({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-ink px-3.5 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/30">
      <Icon size={16} className="shrink-0 text-muted" />
      {children}
    </div>
  );
}
