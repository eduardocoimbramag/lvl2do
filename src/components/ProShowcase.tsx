"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { fadeUp, inViewport, staggerContainer } from "@/lib/animations";
import { proPlan } from "@/data/landingContent";
import { OrbitDecor } from "./AnimatedSvgIcon";
import { cn } from "@/lib/utils";

/**
 * Card único do plano Pro: texto (esquerda) + arte do personagem (direita),
 * seguido por dois CTAs (teste grátis / plano anual).
 */
export function ProShowcase() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={inViewport}
      className="card-surface relative mx-auto mt-14 max-w-5xl overflow-hidden shadow-glow"
    >
      {/* faixa luminosa no topo + blobs de brilho */}
      <div className="absolute inset-x-0 top-0 h-px bg-brand-gradient" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/20 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-light/10 blur-[100px]" />

      <div className="relative grid items-center gap-8 p-8 sm:p-10 lg:grid-cols-2 lg:gap-12 lg:p-12">
        {/* ---------------- ESQUERDA — texto ---------------- */}
        <div>
          <motion.span variants={fadeUp} className="eyebrow">
            <Sparkles size={13} /> {proPlan.eyebrow}
          </motion.span>

          <motion.h3
            variants={fadeUp}
            className="mt-5 font-display text-2xl font-bold leading-tight tracking-tight text-soft sm:text-3xl"
          >
            {proPlan.title}
          </motion.h3>

          <motion.p variants={fadeUp} className="mt-3 text-sm leading-relaxed text-muted">
            {proPlan.description}
          </motion.p>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {proPlan.features.map((f) => (
              <motion.li
                key={f}
                variants={fadeUp}
                className="flex items-center gap-2.5 text-sm text-soft"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand-light shadow-glow-sm">
                  <Check size={12} strokeWidth={3} />
                </span>
                {f}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* ---------------- DIREITA — arte do personagem ---------------- */}
        <motion.div
          variants={fadeUp}
          className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center"
        >
          <OrbitDecor className="-m-2" />
          <div className="absolute inset-10 rounded-full bg-brand/25 blur-3xl" />
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative h-full w-full"
          >
            <Image
              src="/characters/bruxalv100.webp"
              alt="Personagem Pro evoluído"
              fill
              sizes="(max-width: 1024px) 80vw, 40vw"
              className="object-contain drop-shadow-[0_20px_45px_rgba(139,92,246,0.45)]"
              priority={false}
            />
          </motion.div>

          {/* badge flutuante "nível máximo" */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            className="absolute bottom-2 left-0 flex items-center gap-2 rounded-2xl border border-brand/30 bg-ink-card/90 px-3 py-2 shadow-glow backdrop-blur"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient">
              <Sparkles size={14} className="text-white" />
            </span>
            <div className="text-xs">
              <p className="font-semibold text-soft">Nível 100</p>
              <p className="text-[10px] text-muted">Evolução completa</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ---------------- CTAs ---------------- */}
      <div className="relative grid gap-6 border-t border-white/[0.06] bg-white/[0.015] p-8 sm:grid-cols-2 sm:p-10">
        {proPlan.ctas.map((cta) => (
          <motion.div key={cta.label} variants={fadeUp} className="flex flex-col">
            <CtaButton href={cta.href} variant={cta.variant}>
              {cta.label}
              {cta.variant === "primary" && <ArrowRight size={18} />}
            </CtaButton>
            <p className="mt-3 text-center text-xs leading-relaxed text-muted">{cta.note}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/** Botão de CTA full-width com duas variantes em destaque (primária / contornada). */
function CtaButton({
  href,
  variant,
  children,
}: {
  href: string;
  variant: "primary" | "outline";
  children: React.ReactNode;
}) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="w-full">
      <Link
        href={href}
        className={cn(
          "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-7 text-base font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
          variant === "primary"
            ? "bg-brand-gradient text-white shadow-glow-sm hover:shadow-glow hover:brightness-110"
            : "border border-brand/40 bg-brand/10 text-brand-light hover:border-brand/60 hover:bg-brand/15",
        )}
      >
        {children}
      </Link>
    </motion.div>
  );
}
