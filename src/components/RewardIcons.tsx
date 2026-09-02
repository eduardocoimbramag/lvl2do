import { cn } from "@/lib/utils";

interface IconProps {
  size?: number;
  className?: string;
}

/** Cristal de energia — gema facetada na cor da marca. */
export function CrystalIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("text-brand-light", className)}
    >
      <path
        d="M12 2 18.5 9 12 22 5.5 9Z"
        fill="currentColor"
        fillOpacity="0.28"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 9h13M12 2v20M9 9l3 13M15 9l-3 13"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.65"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Boné — não existe na lucide; ícone próprio em traço consistente. */
export function CapIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("text-brand-light", className)}
    >
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13h12" />
      <path d="M16 13h3.5a2 2 0 0 1 0 4H16z" />
      <path d="M12 5h.01" />
    </svg>
  );
}

/**
 * Moeda de ouro — mesma linguagem do cristal (silhueta preenchida a 28% com
 * traço de 1.5 e detalhe interno a 1). A lucide tem `Coins`, mas ele é um
 * traço puro que ficaria mais leve que o cristal ao lado, quebrando o par.
 */
export function GoldCoinIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("text-amber-300", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="8.25"
        fill="currentColor"
        fillOpacity="0.28"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="12"
        cy="12"
        r="5.25"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.65"
        fill="none"
      />
      {/* "L" de lvl2do cunhada na face */}
      <path
        d="M10.6 9.4v5.2h2.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
