"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Settings, ShieldAlert, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { useAuth } from "./AuthProvider";
import { isDevUser } from "@/lib/devAccess";
import { resetMyAccount } from "@/lib/db/resetAccount";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal de Configurações. No fim, exibe a "Área de ADM" (ferramentas de dev)
 * SOMENTE para e-mails autorizados (ver isDevUser) — incluindo o master reset
 * da conta para testes.
 */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const dev = isDevUser(user?.email);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Configurações"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="card-surface relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-brand-light">
                  <Settings size={18} />
                </span>
                <h2 className="font-display text-lg font-semibold text-soft">Configurações</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-soft"
              >
                <X size={18} />
              </button>
            </div>

            <div className="-mr-2 space-y-5 overflow-y-auto pr-2">
              {/* conta */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Conta
                </h3>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-sm text-soft">{user?.email ?? "—"}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Gerencie seu perfil na aba <span className="text-brand-light">Perfil</span>.
                  </p>
                </div>
              </section>

              {/* preferências (placeholder para o futuro) */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Preferências
                </h3>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-sm text-muted">
                    Mais opções de personalização chegarão em breve.
                  </p>
                </div>
              </section>

              {/* área de ADM — só para dev */}
              {dev && <AdminArea />}
            </div>

            <div className="mt-6">
              <Button variant="secondary" className="w-full" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Ferramentas de administração/dev (reset de conta). */
function AdminArea() {
  // fluxo de confirmação: idle → confirming → resetting
  const [phase, setPhase] = useState<"idle" | "confirming" | "resetting">("idle");
  const [resetOnboarding, setResetOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setPhase("resetting");
    setError(null);
    try {
      await resetMyAccount({ resetOnboarding });
      // recarrega do zero (re-hidrata tudo do banco/localStorage limpo)
      window.location.href = resetOnboarding ? "/onboarding" : "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao resetar.");
      setPhase("idle");
    }
  }

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-300">
        <ShieldAlert size={13} /> Área de ADM
      </h3>
      <div className="rounded-2xl border border-rose-400/30 bg-rose-400/[0.06] p-4">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-300" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-soft">Resetar conta (dev)</p>
            <p className="mt-1 text-xs text-muted">
              Zera XP, nível, streak, missões, métricas, alarmes, notificações e
              tickets — como uma conta recém-criada. Ação{" "}
              <span className="text-rose-300">irreversível</span>.
            </p>
          </div>
        </div>

        {/* opção: voltar ao onboarding (limpa classe/skin) */}
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={resetOnboarding}
            onChange={(e) => setResetOnboarding(e.target.checked)}
            disabled={phase === "resetting"}
            className="h-3.5 w-3.5 rounded border-white/20 bg-ink accent-brand"
          />
          Também limpar classe/roupa (volta à escolha de classe)
        </label>

        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}

        <div className="mt-3">
          {phase === "idle" && (
            <button
              type="button"
              onClick={() => setPhase("confirming")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-400/20"
            >
              <Trash2 size={14} /> Resetar minha conta
            </button>
          )}

          {phase === "confirming" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-soft">Tem certeza? Não dá para desfazer.</span>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/50 bg-rose-400/20 px-3 py-1.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-400/30"
              >
                <Trash2 size={13} /> Sim, apagar tudo
              </button>
              <button
                type="button"
                onClick={() => setPhase("idle")}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted transition-colors hover:text-soft"
              >
                Cancelar
              </button>
            </div>
          )}

          {phase === "resetting" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Loader2 size={14} className="animate-spin" /> Resetando…
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
