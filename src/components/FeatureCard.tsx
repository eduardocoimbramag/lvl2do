"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { fadeUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  /** número da etapa (opcional) — usado em "Como funciona" */
  step?: number;
}

/** Card reutilizável para seções "Como funciona" e "Recursos". */
export function FeatureCard({ icon: Icon, title, description, className, step }: FeatureCardProps) {
  return (
    <motion.div variants={fadeUp} className={cn("card-glow group relative p-6", className)}>
      {step !== undefined && (
        <span className="absolute right-5 top-5 font-display text-4xl font-bold text-white/[0.04]">
          {String(step).padStart(2, "0")}
        </span>
      )}
      <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand-light transition-all duration-300 group-hover:bg-brand/20 group-hover:shadow-glow-sm">
        <Icon size={22} />
      </span>
      <h3 className="relative mt-4 font-display text-base font-semibold text-soft">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-muted">{description}</p>
    </motion.div>
  );
}
