"use client";

import type { ComponentType } from "react";
import { motion } from "framer-motion";
import {
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
import { fadeUp } from "@/lib/animations";
import type { Product } from "@/data/store";
import { cn } from "@/lib/utils";

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

interface ProductCardProps {
  product: Product;
  /** saldo atual de cristais (para saber se dá pra trocar). */
  crystals: number;
  onRedeem: () => void;
}

/** Card de produto da loja. */
export function ProductCard({ product, crystals, onRedeem }: ProductCardProps) {
  const Icon = ICONS[product.iconKey] ?? Package;
  const affordable = crystals >= product.cost;
  const missing = product.cost - crystals;

  return (
    <motion.div variants={fadeUp} className="card-glow group flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand-light transition-colors group-hover:bg-brand/20">
          <Icon size={26} />
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-muted">
          {product.category}
        </span>
      </div>

      <h3 className="mt-4 font-display text-base font-semibold text-soft">{product.name}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">{product.description}</p>

      <div className="mt-auto flex items-end justify-between gap-2 pt-5">
        <div>
          <span className="inline-flex items-center gap-1.5 font-display text-lg font-bold tabular-nums text-soft">
            <CrystalIcon size={18} /> {product.cost.toLocaleString("pt-BR")}
          </span>
          {!affordable && (
            <p className="text-[11px] text-amber-400">Faltam {missing.toLocaleString("pt-BR")}</p>
          )}
        </div>

        <Button
          size="sm"
          variant={affordable ? "primary" : "secondary"}
          onClick={onRedeem}
          disabled={!affordable}
          className={cn(!affordable && "opacity-60")}
        >
          Trocar
        </Button>
      </div>
    </motion.div>
  );
}
