"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, Lock, User, MailCheck, Gift } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

/** /register — cadastro por e-mail + senha (Supabase Auth). */
export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);

  // captura o código de indicação do link (?ref=CODE)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code) setRefCode(code.trim().toUpperCase());
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (password.length < 6) {
      setError("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: refCode ? { name, ref_code: refCode } : { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(
        error.message.includes("already")
          ? "Este e-mail já está cadastrado."
          : "Não foi possível criar a conta. Tente novamente.",
      );
      setLoading(false);
      return;
    }

    if (data.session) {
      // confirmação de e-mail desativada → já está logado
      router.replace("/onboarding");
      router.refresh();
    } else {
      // confirmação de e-mail ativada → avisa para checar a caixa
      setSent(true);
      setLoading(false);
    }
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
          {sent ? (
            <div className="flex flex-col items-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand-light">
                <MailCheck size={26} />
              </span>
              <h1 className="mt-4 font-display text-xl font-bold text-soft">Confirme seu e-mail</h1>
              <p className="mt-2 text-sm text-muted">
                Enviamos um link de confirmação para <span className="text-soft">{email}</span>.
                Abra-o para ativar sua conta.
              </p>
              <Link
                href="/login"
                className="mt-6 text-sm font-medium text-brand-light hover:text-brand-vivid"
              >
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-center">
                <Logo size="lg" href={undefined} />
                <h1 className="mt-5 font-display text-2xl font-bold text-soft">Criar conta</h1>
                <p className="mt-1 text-sm text-muted">Comece sua jornada de evolução.</p>
              </div>

              <form onSubmit={onSubmit} className="mt-7 space-y-4">
                <Field icon={User}>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-transparent py-2.5 text-sm text-soft placeholder:text-muted/60 focus:outline-none"
                  />
                </Field>
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
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha (mín. 6 caracteres)"
                    className="w-full bg-transparent py-2.5 text-sm text-soft placeholder:text-muted/60 focus:outline-none"
                  />
                </Field>

                {refCode && (
                  <p className="inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-brand/10 px-3 py-2 text-xs text-brand-light">
                    <Gift size={13} /> Convite aplicado · código{" "}
                    <span className="font-semibold">{refCode}</span>
                  </p>
                )}

                {error && <p className="text-sm text-red-400">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Criando...
                    </>
                  ) : (
                    "Criar conta"
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted">
                Já tem conta?{" "}
                <Link href="/login" className="font-medium text-brand-light hover:text-brand-vivid">
                  Entrar
                </Link>
              </p>
            </>
          )}
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
