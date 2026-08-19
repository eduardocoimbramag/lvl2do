"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField, authInputClass } from "@/components/auth/AuthField";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { createClient } from "@/lib/supabase/client";
import { MIN_PASSWORD_LENGTH, validatePassword } from "@/lib/auth/password";

type Status = "checking" | "ready" | "invalid" | "done";

/** Tempo até levar o usuário ao app depois de trocar a senha. */
const REDIRECT_DELAY_MS = 2000;

/**
 * /reset-password — define a nova senha.
 *
 * Só é alcançável com o cookie de recuperação emitido pelo /auth/callback (o
 * middleware barra o resto). Aqui confirmamos também que a sessão existe, para
 * dar uma mensagem decente caso o link tenha expirado com a aba aberta.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Confirma que o link gerou mesmo uma sessão válida.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted.current) return;
      setStatus(data.user && !error ? "ready" : "invalid");
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const policyError = validatePassword(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem. Digite a mesma senha nos dois campos.");
      return;
    }

    setLoading(true);
    setError(null);

    let payload: { ok?: boolean; error?: string } = {};
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      payload = await res.json().catch(() => ({}));

      if (!mounted.current) return;

      if (!res.ok) {
        setError(payload.error ?? "Não foi possível alterar a senha. Tente novamente.");
        // 401/403 = link morto: não adianta reenviar o formulário.
        if (res.status === 401 || res.status === 403) setStatus("invalid");
        setLoading(false);
        return;
      }

      // Só o `ok: true` explícito conta como sucesso. Um 200 sem esse corpo
      // significa que a resposta não veio da nossa rota (ex.: redirect seguido
      // pelo fetch) — nunca declarar "senha alterada" nesse caso.
      if (payload.ok !== true) {
        setError("Não foi possível confirmar a alteração. Peça um novo link e tente de novo.");
        setStatus("invalid");
        setLoading(false);
        return;
      }
    } catch {
      if (!mounted.current) return;
      setError("Falha de conexão. Verifique sua internet e tente novamente.");
      setLoading(false);
      return;
    }

    setStatus("done");
    setLoading(false);

    // A sessão atual continua válida — leva direto ao app.
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, REDIRECT_DELAY_MS);
  }

  if (status === "checking") {
    return (
      <AuthShell backHref="/login" backLabel="Voltar para o login">
        <div className="flex flex-col items-center py-6 text-center">
          <Loader2 size={24} className="animate-spin text-brand-light" />
          <p className="mt-3 text-sm text-muted">Validando seu link...</p>
        </div>
      </AuthShell>
    );
  }

  if (status === "invalid") {
    return (
      <AuthShell backHref="/login" backLabel="Voltar para o login">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
            <AlertCircle size={26} />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-soft">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-muted">
            Links de recuperação valem por 1 hora e só podem ser usados uma vez. Peça um novo para
            continuar.
          </p>
          <Link href="/forgot-password" className="mt-6 w-full">
            <Button className="w-full">Pedir novo link</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (status === "done") {
    return (
      <AuthShell backHref="/login" backLabel="Voltar para o login">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 size={26} />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-soft">Senha alterada!</h1>
          <p className="mt-2 text-sm text-muted">
            Sua nova senha já está valendo e as outras sessões foram encerradas.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted">
            <Loader2 size={13} className="animate-spin" /> Levando você ao painel...
          </p>
          <Link
            href="/dashboard"
            className="mt-4 text-sm font-medium text-brand-light hover:text-brand-vivid"
          >
            Ir agora
          </Link>
        </div>
      </AuthShell>
    );
  }

  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <AuthShell backHref="/login" backLabel="Voltar para o login">
      <div className="flex flex-col items-center text-center">
        <Logo size="lg" href={undefined} />
        <span className="mt-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/15 text-brand-light">
          <KeyRound size={20} />
        </span>
        <h1 className="mt-3 font-display text-2xl font-bold text-soft">Criar nova senha</h1>
        <p className="mt-1 text-sm text-muted">
          Escolha uma senha com pelo menos {MIN_PASSWORD_LENGTH} caracteres.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <AuthField icon={Lock}>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoFocus
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nova senha"
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

        <PasswordStrengthMeter password={password} />

        <AuthField icon={Lock}>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            // colar aqui anularia a conferência — digitar de novo pega o typo
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            placeholder="Confirmar nova senha"
            className={authInputClass}
          />
        </AuthField>

        {mismatch && <p className="text-xs text-amber-300/90">As senhas ainda não coincidem.</p>}

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
              <Loader2 size={16} className="animate-spin" /> Salvando...
            </>
          ) : (
            "Salvar nova senha"
          )}
        </Button>

        <p className="flex items-start gap-2 text-xs text-muted/80">
          <ShieldCheck size={13} className="mt-0.5 shrink-0" />
          Ao salvar, todas as outras sessões conectadas serão encerradas.
        </p>
      </form>
    </AuthShell>
  );
}
