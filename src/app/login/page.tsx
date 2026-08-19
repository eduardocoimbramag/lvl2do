"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField, authInputClass } from "@/components/auth/AuthField";
import { createClient } from "@/lib/supabase/client";
import { messageForCallbackError } from "@/lib/auth/authErrors";

/** /login — autenticação por e-mail + senha (Supabase Auth). */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Motivo vindo do /auth/callback (ex.: link de confirmação expirado).
  useEffect(() => {
    const reason = messageForCallbackError(
      new URLSearchParams(window.location.search).get("error"),
    );
    if (reason) setError(reason);
  }, []);

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
    <AuthShell>
      <div className="flex flex-col items-center text-center">
        <Logo size="lg" href={undefined} />
        <h1 className="mt-5 font-display text-2xl font-bold text-soft">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Continue sua jornada de evolução.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <AuthField icon={Mail}>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className={authInputClass}
          />
        </AuthField>
        <AuthField icon={Lock}>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className={authInputClass}
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
        </AuthField>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-muted transition-colors hover:text-brand-light"
          >
            Esqueci minha senha
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

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
    </AuthShell>
  );
}
