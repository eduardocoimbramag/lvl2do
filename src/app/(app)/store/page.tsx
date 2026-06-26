"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ProductCard } from "@/components/ProductCard";
import { RedeemModal } from "@/components/RedeemModal";
import { CrystalIcon } from "@/components/RewardIcons";
import { AnimatedGrid } from "@/components/Section";
import { STORE_PRODUCTS, type Product } from "@/data/store";
import { referralStats } from "@/data/referral";

/**
 * Loja (mock): troca de cristais por produtos físicos.
 * O saldo é local (parte de `referralStats.crystals`); a troca apenas debita
 * em memória — integrar com backend/pagamento depois.
 */
export default function StorePage() {
  const [crystals, setCrystals] = useState(referralStats.crystals);
  const [redeeming, setRedeeming] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function confirmRedeem() {
    if (!redeeming) return;
    setCrystals((c) => c - redeeming.cost);
    setToast(`Resgatado! ${redeeming.name} está a caminho.`);
    setRedeeming(null);
    window.setTimeout(() => setToast(null), 3200);
  }

  return (
    <>
      <PageHeader
        title="Loja"
        subtitle="Troque seus cristais de energia por produtos físicos."
      />

      {/* saldo de cristais (topo) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="card-surface relative flex flex-col gap-4 overflow-hidden p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/20 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <CrystalIcon size={44} className="drop-shadow-[0_6px_18px_rgba(139,92,246,0.5)]" />
          </motion.div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">Saldo de cristais</p>
            <p className="font-display text-3xl font-bold tabular-nums text-soft">
              {crystals.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        <Link
          href="/profile"
          className="relative inline-flex items-center gap-1.5 self-start rounded-xl border border-brand/20 bg-brand/10 px-3.5 py-2 text-sm font-medium text-brand-light transition-colors hover:bg-brand/15 sm:self-auto"
        >
          Ganhe mais indicando amigos <ArrowRight size={15} />
        </Link>
      </motion.div>

      {/* grade de produtos */}
      <AnimatedGrid className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {STORE_PRODUCTS.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            crystals={crystals}
            onRedeem={() => setRedeeming(p)}
          />
        ))}
      </AnimatedGrid>

      <RedeemModal
        product={redeeming}
        crystals={crystals}
        onClose={() => setRedeeming(null)}
        onConfirm={confirmRedeem}
      />

      {/* toast de sucesso */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-success/30 bg-ink-card/95 px-4 py-3 shadow-glow backdrop-blur md:bottom-8"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/20 text-success">
              <Check size={16} />
            </span>
            <p className="text-sm font-medium text-soft">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
