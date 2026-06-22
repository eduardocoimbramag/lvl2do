"use client";

import Link from "next/link";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-white shadow-glow-sm hover:shadow-glow hover:brightness-110",
  secondary:
    "border border-white/10 bg-white/5 text-soft hover:border-brand/40 hover:bg-white/[0.08]",
  ghost: "text-muted hover:text-soft hover:bg-white/5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

interface ButtonBaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

const motionProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
} as const;

/** Botão como link (Next.js) — para CTAs de navegação. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  onClick,
}: ButtonBaseProps & { href: string; onClick?: () => void }) {
  return (
    <motion.div {...motionProps} className="inline-flex">
      <Link
        href={href}
        onClick={onClick}
        className={cn(base, variants[variant], sizes[size], className)}
      >
        {children}
      </Link>
    </motion.div>
  );
}

/** Botão de ação (onClick) — para interações locais. */
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonBaseProps & Omit<HTMLMotionProps<"button">, "children">) {
  return (
    <motion.button
      {...motionProps}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
