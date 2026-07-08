"use client";

import { useState } from "react";
import { Gem, Loader2, Wand2, Check, RotateCcw } from "lucide-react";
import { ProShowcase, type ShowcaseCta } from "@/components/ProShowcase";
import { useAccessGate } from "@/hooks/useAccessGate";
import { PRO_PLAN, CRYSTAL_COPY } from "@/data/subscription";
import { proPlan } from "@/data/landingContent";

/**
 * Paywall — reaproveita o mesmo card premium da seção "Planos" da landing
 * (ProShowcase), mas os CTAs viram AÇÕES: o botão principal abre o checkout do
 * RevenueCat (startCheckout) e o secundário usa 1 cristal para liberar o dia.
 * Abaixo, o texto explicativo de cristais e as dev tools (só fora de produção).
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

  const [loadingCheckout, setLoadingCheckout] = useState(false);
  // mensagem específica do último checkout (erro/cancelamento), ou null
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  async function handleCheckout() {
    setLoadingCheckout(true);
    setCheckoutMessage(null);
    const result = await startCheckout();
    setLoadingCheckout(false);
    if (result.ok) return; // sucesso → o hook recarrega o profile e o guard libera
    // mostra o MOTIVO real (nunca um genérico sem contexto)
    setCheckoutMessage(result.message ?? "Não foi possível iniciar o checkout.");
  }

  // CTAs do showcase como ações (checkout + cristal)
  const ctas: ShowcaseCta[] = [
    {
      label: loadingCheckout ? "Abrindo checkout..." : `Começar ${PRO_PLAN.trialDays} dias grátis`,
      note: `${PRO_PLAN.trialDays} dias grátis. Depois ${PRO_PLAN.priceMonthlyLabel}/mês. Cancele quando quiser.`,
      variant: "primary",
      onClick: handleCheckout,
      disabled: loadingCheckout,
      leading: loadingCheckout ? <Loader2 size={18} className="animate-spin" /> : undefined,
    },
  ];
  if (canUseCrystal) {
    ctas.push({
      label: "Usar 1 cristal hoje",
      note: `Você tem ${crystals} cristal${crystals === 1 ? "" : "s"}. Cada um libera 1 dia de acesso sem assinatura.`,
      variant: "outline",
      onClick: useCrystalForToday,
    });
  }

  return (
    <div className={className}>
      <ProShowcase
        eyebrow={PRO_PLAN.name}
        title="Comece sua jornada completa"
        description="Desbloqueie o lvl2do Pro e transforme sua rotina em uma evolução diária. 14 dias grátis, depois R$ 14,90/mês — cancele quando quiser."
        features={proPlan.features}
        ctas={ctas}
        animateInView={false}
      />

      {/* mensagem específica do checkout (erro/cancelamento) */}
      {checkoutMessage && (
        <p className="mx-auto mt-4 max-w-5xl text-center text-xs text-amber-300/90">
          {checkoutMessage}
        </p>
      )}

      {/* explicação sobre cristais */}
      <div className="mx-auto mt-5 max-w-5xl rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
        <p className="flex items-start gap-2 text-xs text-muted">
          <Gem size={14} className="mt-0.5 shrink-0 text-brand-light" />
          <span>
            {CRYSTAL_COPY.oneDayPerCrystal} {CRYSTAL_COPY.earnByReferral} Convide amigos para
            ganhar cristais e continuar jogando mesmo sem assinatura ativa.
          </span>
        </p>
      </div>

      {/* -------- DEV TOOLS (apenas fora de produção) -------- */}
      {isDev && (
        <div className="mx-auto mt-4 max-w-5xl rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3">
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
  );
}
