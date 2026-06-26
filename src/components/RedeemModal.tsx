"use client";

import type { ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Sticker,
  KeyRound,
  Coffee,
  ShoppingBag,
  Watch,
  NotebookPen,
  Mouse,
  CupSoda,
  Shirt,
  Frame,
  Package,
} from "lucide-react";
import { CrystalIcon, CapIcon } from "./RewardIcons";
import { Button } from "./Button";
import type { Product } from "@/data/store";

const ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  sticker: Sticker,
  key: KeyRound,
  mug: Coffee,
  bag: ShoppingBag,
  bracelet: Watch,
  notebook: NotebookPen,
  mouse: Mouse,
  cap: CapIcon,
  bottle: CupSoda,
  shirt: Shirt,
  poster: Frame,
  kit: Package,
};

interface RedeemModalProps {
  product: Product | null;
  crystals: number;
  onClose: () => void;
  onConfirm: () => void;
}

/** Modal de confirmação da troca de cristais por um produto. */
export function RedeemModal({ product, crystals, onClose, onConfirm }: RedeemModalProps) {
  const Icon = product ? ICONS[product.iconKey] ?? Package : Package;
  const remaining = product ? crystals - product.cost : 0;

  return (
    <AnimatePresence>
      {product && (
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
            aria-label={`Trocar por ${product.name}`}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="card-surface relative w-full max-w-sm overflow-hidden rounded-b-none rounded-t-3xl p-6 text-center sm:rounded-3xl"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/20 blur-3xl" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-soft"
            >
              <X size={18} />
            </button>

            <div className="relative">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                <Icon size={30} />
              </span>

              <h2 className="mt-4 font-display text-lg font-semibold text-soft">{product.name}</h2>
              <p className="mt-1 text-xs text-muted">{product.description}</p>

              <div className="mt-5 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
                <Row label="Custo">
                  <span className="inline-flex items-center gap-1 font-semibold text-soft">
                    <CrystalIcon size={15} /> {product.cost.toLocaleString("pt-BR")}
                  </span>
                </Row>
                <Row label="Saldo atual">
                  <span className="inline-flex items-center gap-1 text-soft">
                    <CrystalIcon size={15} /> {crystals.toLocaleString("pt-BR")}
                  </span>
                </Row>
                <div className="border-t border-white/[0.06] pt-2">
                  <Row label="Saldo após a troca">
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-light">
                      <CrystalIcon size={15} /> {remaining.toLocaleString("pt-BR")}
                    </span>
                  </Row>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={onClose}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={onConfirm}>
                  Confirmar troca
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      {children}
    </div>
  );
}
