"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { fadeUp, inViewport, staggerContainer } from "@/lib/animations";
import { proPlan } from "@/data/landingContent";
import { OrbitDecor } from "./AnimatedSvgIcon";
import { cn } from "@/lib/utils";

/** Um CTA do showcase: link (landing) OU ação (paywall/checkout). */
export interface ShowcaseCta {
  label: string;
  note: string;
  variant: "primary" | "outline";
  /** navegação (landing). */
  href?: string;
  /** ação (ex.: abrir checkout). Tem prioridade sobre href quando presente. */
  onClick?: () => void;
  /** desabilita o botão (ex.: durante o loading do checkout). */
  disabled?: boolean;
  /** conteúdo à esquerda do label (ex.: spinner). */
  leading?: React.ReactNode;
}

interface ProShowcaseProps {
  /** sobrescreve o eyebrow/título/descrição (padrão: proPlan da landing). */
  eyebrow?: string;
  title?: string;
  description?: string;
  /** lista de features (padrão: proPlan.features). */
  features?: string[];
  /** CTAs (padrão: os da landing, como links para /register). */
  ctas?: ShowcaseCta[];
  /** animar ao entrar na viewport (landing) ou já visível (paywall). */
  animateInView?: boolean;
  className?: string;
}

/**
 * Card único do plano Pro: texto + features (esquerda) e arte do personagem
 * (direita), com CTAs embaixo. Reutilizado na landing (CTAs = links) e no
 * paywall (CTAs = ações que abrem o checkout do RevenueCat).
 */
export function ProShowcase({
  eyebrow = proPlan.eyebrow,
  title = proPlan.title,
  description = proPlan.description,
  features = proPlan.features,
  ctas,
  animateInView = true,
  className,
}: ProShowcaseProps = {}) {
  // CTAs padrão: os da landing (links para /register).
  const resolvedCtas: ShowcaseCta[] =
    ctas ??
    proPlan.ctas.map((c) => ({
      label: c.label,
      note: c.note,
      variant: c.variant,
      href: c.href,
    }));

  // animação de entrada: por viewport (landing) ou imediata (paywall).
  const motionProps = animateInView
    ? { initial: "hidden" as const, whileInView: "show" as const, viewport: inViewport }
    : { initial: "hidden" as const, animate: "show" as const };

  return (
    <motion.div
      variants={staggerContainer}
      {...motionProps}
      className={cn(
        "card-surface relative mx-auto max-w-5xl overflow-hidden shadow-glow",
        className,
      )}
    >
      {/* faixa luminosa no topo + blobs de brilho */}
      <div className="absolute inset-x-0 top-0 h-px bg-brand-gradient" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/20 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-light/10 blur-[100px]" />

      <div className="relative grid items-center gap-8 p-8 sm:p-10 lg:grid-cols-2 lg:gap-12 lg:p-12">
        {/* ---------------- ESQUERDA — texto ---------------- */}
        <div>
          <motion.span variants={fadeUp} className="eyebrow">
            <Sparkles size={13} /> {eyebrow}
          </motion.span>

          <motion.h3
            variants={fadeUp}
            className="mt-5 font-display text-2xl font-bold leading-tight tracking-tight text-soft sm:text-3xl"
          >
            {title}
          </motion.h3>

          <motion.p variants={fadeUp} className="mt-3 text-sm leading-relaxed text-muted">
            {description}
          </motion.p>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
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
      <div
        className={cn(
          "relative grid gap-6 border-t border-white/[0.06] bg-white/[0.015] p-8 sm:p-10",
          resolvedCtas.length > 1 && "sm:grid-cols-2",
        )}
      >
        {resolvedCtas.map((cta) => (
          <motion.div key={cta.label} variants={fadeUp} className="flex flex-col">
            <CtaButton
              href={cta.href}
              onClick={cta.onClick}
              variant={cta.variant}
              disabled={cta.disabled}
            >
              {cta.leading}
              {cta.label}
              {cta.variant === "primary" && !cta.leading && <ArrowRight size={18} />}
            </CtaButton>
            <p className="mt-3 text-center text-xs leading-relaxed text-muted">{cta.note}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/** Botão de CTA full-width — link (href) ou ação (onClick). */
function CtaButton({
  href,
  onClick,
  variant,
  disabled,
  children,
}: {
  href?: string;
  onClick?: () => void;
  variant: "primary" | "outline";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const classes = cn(
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-7 text-base font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-60",
    variant === "primary"
      ? "bg-brand-gradient text-white shadow-glow-sm hover:shadow-glow hover:brightness-110"
      : "border border-brand/40 bg-brand/10 text-brand-light hover:border-brand/60 hover:bg-brand/15",
  );

  // ação (paywall) tem prioridade sobre link (landing)
  if (onClick || !href) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        className={classes}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="w-full">
      <Link href={href} className={classes}>
        {children}
      </Link>
    </motion.div>
  );
}
