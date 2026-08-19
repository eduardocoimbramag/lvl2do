"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Mail, MailCheck, KeyRound, AlertCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField, authInputClass } from "@/components/auth/AuthField";
import { createClient } from "@/lib/supabase/client";
import { messageForResetRequestError, messageForCallbackError } from "@/lib/auth/authErrors";

/** Intervalo mínimo entre reenvios — evita bater no limite de e-mails do Supabase. */
const RESEND_COOLDOWN_SECONDS = 60;

/** /forgot-password — pede o e-mail com o link de redefinição de senha. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Motivo vindo do /auth/callback (link expirado, aberto em outro navegador...).
  useEffect(() => {
    const reason = messageForCallbackError(
      new URLSearchParams(window.location.search).get("error"),
    );
    if (reason) setError(reason);
  }, []);

  // Contagem regressiva do reenvio.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendResetEmail = useCallback(async (address: string) => {
    const supabase = createClient();
    // `flow=recovery` marca o link como recuperação também no fluxo PKCE, onde
    // o Supabase não devolve `type` na volta.
    return supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/auth/callback?flow=recovery&next=%2Freset-password`,
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const { error } = await sendResetEmail(email.trim());
    if (!mounted.current) return;

    if (error) {
      setError(messageForResetRequestError(error));
      setLoading(false);
      return;
    }

    // Sucesso é sempre genérico: nunca revelamos se o e-mail existe na base
    // (evita enumeração de contas).
    setSent(true);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setLoading(false);
  }

  async function onResend() {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setError(null);

    const { error } = await sendResetEmail(email.trim());
    if (!mounted.current) return;

    if (error) setError(messageForResetRequestError(error));
    else setCooldown(RESEND_COOLDOWN_SECONDS);
    setLoading(false);
  }

  return (
    <AuthShell backHref="/login" backLabel="Voltar para o login">
      {sent ? (
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand-light">
            <MailCheck size={26} />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-soft">Verifique seu e-mail</h1>
          <p className="mt-2 text-sm text-muted">
            Se houver uma conta para <span className="text-soft">{email}</span>, enviamos um link
            para redefinir a senha. Ele vale por 1 hora.
          </p>
          <p className="mt-3 text-xs text-muted/80">
            Não chegou? Confira a caixa de spam antes de reenviar.
          </p>

          {error && <ErrorNote>{error}</ErrorNote>}

          <Button
            variant="secondary"
            className="mt-5 w-full"
            onClick={onResend}
            disabled={loading || cooldown > 0}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Reenviando...
              </>
            ) : cooldown > 0 ? (
              `Reenviar em ${cooldown}s`
            ) : (
              "Reenviar e-mail"
            )}
          </Button>

          <Link
            href="/login"
            className="mt-5 text-sm font-medium text-brand-light hover:text-brand-vivid"
          >
            Voltar para o login
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center text-center">
            <Logo size="lg" href={undefined} />
            <span className="mt-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/15 text-brand-light">
              <KeyRound size={20} />
            </span>
            <h1 className="mt-3 font-display text-2xl font-bold text-soft">Esqueceu a senha?</h1>
            <p className="mt-1 text-sm text-muted">
              Informe seu e-mail e enviamos um link para criar uma nova.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <AuthField icon={Mail}>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={authInputClass}
              />
            </AuthField>

            {error && <ErrorNote>{error}</ErrorNote>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Enviando...
                </>
              ) : (
                "Enviar link de recuperação"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Lembrou a senha?{" "}
            <Link href="/login" className="font-medium text-brand-light hover:text-brand-vivid">
              Entrar
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-left text-sm text-red-300"
    >
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
