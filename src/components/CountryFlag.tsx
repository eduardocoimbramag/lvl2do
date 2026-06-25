import { getCountry } from "@/data/social";
import { cn } from "@/lib/utils";

interface CountryFlagProps {
  /** código ISO-3166 alpha-2 (minúsculo), ex.: "br". */
  code: string;
  className?: string;
}

/**
 * Bandeira do país (ranking/perfil).
 * Usa flagcdn.com (sem dependências). Para uso 100% offline, troque por
 * imagens locais em /public/flags ou por um set de SVGs.
 */
export function CountryFlag({ code, className }: CountryFlagProps) {
  const name = getCountry(code)?.name ?? code.toUpperCase();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={20}
      height={15}
      loading="lazy"
      alt={`Bandeira: ${name}`}
      title={name}
      className={cn(
        "inline-block h-[15px] w-5 shrink-0 rounded-[3px] object-cover ring-1 ring-white/15",
        className,
      )}
    />
  );
}
