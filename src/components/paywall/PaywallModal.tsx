"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Check,
  Gem,
  Loader2,
  ShieldCheck,
  Wand2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { useAccessGate } from "@/hooks/useAccessGate";
import { PRO_PLAN, PRO_BENEFITS, CRYSTAL_COPY } from "@/data/subscription";
import { cn } from "@/lib/utils";

/**
 * Janela premium/gamificada do paywall. Apresenta o plano Pro (trial + preço),
 * os benefícios, e as ações: começar o trial (checkout — placeholder) ou usar
 * 1 cristal para liberar o dia. Em desenvolvimento, mostra um bloco discreto de
 * "Dev tools" para simular o acesso e testar o app interno.
 */
export function PaywallModal({ className }: { className?: string }) {
  const {
    crystals,
    canUseCrystal,
    useCrystalForToday,
    startCheckout,
    isDev,
    simulateProAccess,
    resetDevAccess,
  } = useAccessGate();

  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "unavailable">("idle");

  async function handleCheckout() {
    setCheckoutState("loading");
    const result = await startCheckout();
    // pagamento real ainda não existe → sinaliza indisponível (sem quebrar).
    setCheckoutState(result.ok ? "idle" : "unavailable");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "card-surface relative w-full max-w-lg overflow-hidden p-6 shadow-glow sm:p-8",
        className,
      )}
    >
      {/* glow decorativo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-brand-vivid/15 blur-3xl" />
      </div>

      <div className="relative">
        {/* cabeçalho */}
        <div className="flex flex-col items-center text-center">
          <Logo size="md" href={undefined} />
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand-light">
            <Sparkles size={13} /> {PRO_PLAN.name}
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-soft sm:text-3xl">
            Comece sua jornada completa
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            Desbloqueie o lvl2do Pro e transforme sua rotina em uma evolução diária.
          </p>
        </div>

        {/* destaque de preço/trial */}
        <div className="mt-6 rounded-2xl border border-brand/25 bg-brand/[0.06] p-4 text-center">
          <div className="flex items-end justify-center gap-1.5">
            <span className="font-display text-3xl font-bold text-soft">{PRO_PLAN.trialDays} dias grátis</span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Depois <span className="font-semibold text-brand-light">{PRO_PLAN.priceMonthlyLabel}/mês</span> ·
            Cancele quando quiser
          </p>
        </div>

        {/* benefícios */}
        <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {PRO_BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <li
                key={b.title}
                className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-light">
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-soft">{b.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{b.description}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {/* ação principal: começar trial */}
        <div className="mt-6 space-y-3">
          <Button className="w-full" size="lg" onClick={handleCheckout} disabled={checkoutState === "loading"}>
            {checkoutState === "loading" ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Abrindo...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Começar {PRO_PLAN.trialDays} dias grátis
              </>
            )}
          </Button>

          {checkoutState === "unavailable" && (
            <p className="text-center text-xs text-amber-300/90">
              A assinatura estará disponível em breve. Enquanto isso, use um cristal para acessar hoje.
            </p>
          )}

          {/* ação secundária: usar cristal */}
          {canUseCrystal ? (
            <>
              <Button variant="secondary" className="w-full" size="lg" onClick={useCrystalForToday}>
                <Gem size={16} /> Usar 1 cristal hoje
              </Button>
              <p className="text-center text-xs text-muted">
                Você tem <span className="font-medium text-brand-light">{crystals}</span> cristais
                disponíveis. Cada cristal libera 1 dia de acesso sem assinatura ativa.
              </p>
            </>
          ) : (
            <p className="text-center text-xs text-muted">
              Você não tem cristais disponíveis. Faça a assinatura para continuar sua jornada.
            </p>
          )}
        </div>

        {/* explicação sobre cristais */}
        <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <p className="flex items-start gap-2 text-xs text-muted">
            <Gem size={14} className="mt-0.5 shrink-0 text-brand-light" />
            <span>
              {CRYSTAL_COPY.oneDayPerCrystal} {CRYSTAL_COPY.earnByReferral} Convide amigos para
              ganhar cristais e continuar jogando mesmo sem assinatura ativa.
            </span>
          </p>
        </div>

        {/* selo de confiança */}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted/70">
          <ShieldCheck size={12} /> Sem cobrança durante o teste · Cancele quando quiser
        </p>

        {/* -------- DEV TOOLS (apenas fora de produção) -------- */}
        {isDev && (
          <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <Wand2 size={12} /> Dev tools (não aparece em produção)
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={simulateProAccess}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand-light transition-colors hover:bg-brand/20"
              >
                <Check size={13} /> Simular Pro ativo
              </button>
              <button
                type="button"
                onClick={resetDevAccess}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted transition-colors hover:text-soft"
              >
                <RotateCcw size={13} /> Resetar simulação
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
