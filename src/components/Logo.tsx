import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  className?: string;
  /** show the small abstract level/bolt mark */
  withMark?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

/**
 * Logo textual "lvl2do":
 *  - "lvl" em branco
 *  - "2" em roxo neon
 *  - "do" em lilás
 * Com um pequeno ícone abstrato de nível/raio ao lado.
 */
export function Logo({ href = "/", className, withMark = true, size = "md" }: LogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2 font-display font-bold tracking-tight", sizes[size], className)}>
      {withMark && <LogoMark />}
      <span className="text-soft">
        lvl
        <span className="text-gradient">2</span>
        <span className="text-brand-light">do</span>
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="lvl2do — início" className="group inline-flex">
      {content}
    </Link>
  );
}

/** Pequeno mark abstrato: raio/nível dentro de um quadrado com glow. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient shadow-glow-sm",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4.5 w-4.5"
        width="18"
        height="18"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
          fill="white"
          stroke="white"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
