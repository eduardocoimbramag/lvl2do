"use client";

import { motion } from "framer-motion";
import { fadeUp, inViewport, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

/** Cabeçalho de seção padronizado (eyebrow + título + subtítulo). */
export function SectionHeader({ eyebrow, title, subtitle, className }: SectionHeaderProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={inViewport}
      className={cn("mx-auto max-w-2xl text-center", className)}
    >
      {eyebrow && (
        <motion.span variants={fadeUp} className="eyebrow">
          {eyebrow}
        </motion.span>
      )}
      <motion.h2
        variants={fadeUp}
        className="mt-4 font-display text-3xl font-bold tracking-tight text-soft sm:text-4xl"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p variants={fadeUp} className="mt-4 text-base leading-relaxed text-muted">
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

/** Wrapper de grid animado com stagger. */
export function AnimatedGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={inViewport}
      className={className}
    >
      {children}
    </motion.div>
  );
}
