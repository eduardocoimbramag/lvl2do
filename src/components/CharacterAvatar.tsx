import Image from "next/image";
import { CharacterBackdrop } from "./CharacterBackdrop";
import { getCharacterImage, type CharacterClass } from "@/data/characterClasses";
import type { CharacterBackgroundId } from "@/data/characterBackgrounds";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-20 w-20",
  /** trilho de stories: cresce no desktop sem duplicar o componente. */
  story: "h-14 w-14 sm:h-16 sm:w-16",
} as const;

/** Moldura: quadrada (padrão do app) ou circular (trilho de stories). */
const SHAPES = {
  square: "rounded-xl",
  circle: "rounded-full",
} as const;

interface CharacterAvatarProps {
  characterClass: CharacterClass | null;
  level: number;
  size?: keyof typeof SIZES;
  /** mostra o selo de nível no canto. */
  showLevel?: boolean;
  /** formato da moldura. "circle" é usado no trilho de stories. */
  shape?: keyof typeof SHAPES;
  /** cenário atrás do personagem. Omitido = fundo escuro padrão. */
  background?: CharacterBackgroundId;
  className?: string;
}

/**
 * Miniatura do personagem (arte por classe/nível) com selo de nível.
 * Reutilizada em Amigos e Ranking.
 */
export function CharacterAvatar({
  characterClass,
  level,
  size = "md",
  showLevel = true,
  shape = "square",
  background = "none",
  className,
}: CharacterAvatarProps) {
  const art = characterClass ? getCharacterImage(characterClass, level) : null;

  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "relative overflow-hidden border border-white/10 bg-ink shadow-glow-sm",
          SHAPES[shape],
          SIZES[size],
        )}
      >
        <CharacterBackdrop background={background} />
        {art ? (
          <Image
            src={art}
            alt={characterClass ?? "Personagem"}
            fill
            sizes="80px"
            className="relative object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-gradient font-display text-lg font-bold text-white">
            ?
          </div>
        )}
      </div>

      {showLevel && (
        <span className="absolute -bottom-1.5 -right-1.5 flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-ink-card bg-brand-gradient px-1 font-display text-[11px] font-bold text-white shadow-glow-sm tabular-nums">
          {level}
        </span>
      )}
    </div>
  );
}
