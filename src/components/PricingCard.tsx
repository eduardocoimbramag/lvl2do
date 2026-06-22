"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { fadeUp } from "@/lib/animations";
import { ButtonLink } from "./Button";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  cta: { label: string; href: string };
  disabled?: boolean;
}

/** Card de plano (Free / Pro). */
export function PricingCard({
  name,
  price,
  description,
  features,
  highlighted,
  badge,
  cta,
  disabled,
}: PricingCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        "card-surface relative flex flex-col p-7",
        highlighted && "border-brand/40 shadow-glow",
      )}
    >
      {highlighted && (
        <div className="absolute -top-px left-0 h-px w-full bg-brand-gradient" />
      )}
      {badge && (
        <span className="absolute right-6 top-6 inline-flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-medium text-brand-light">
          <Sparkles size={12} /> {badge}
        </span>
      )}

      <h3 className="font-display text-lg font-semibold text-soft">{name}</h3>
      <p className="mt-1 text-sm text-muted">{description}</p>

      <div className="mt-5 flex items-end gap-1">
        <span className="font-display text-4xl font-bold text-soft">{price}</span>
      </div>

      <ul className="mt-6 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-muted">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-light">
              <Check size={12} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-8 pt-2">
        {disabled ? (
          <span className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-muted">
            {cta.label}
          </span>
        ) : (
          <ButtonLink
            href={cta.href}
            variant={highlighted ? "primary" : "secondary"}
            className="w-full"
          >
            {cta.label}
          </ButtonLink>
        )}
      </div>
    </motion.div>
  );
}
