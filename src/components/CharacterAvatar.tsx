import Image from "next/image";
import { getCharacterImage, type CharacterClass } from "@/data/characterClasses";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-20 w-20",
} as const;

interface CharacterAvatarProps {
  characterClass: CharacterClass | null;
  level: number;
  size?: keyof typeof SIZES;
  /** mostra o selo de nível no canto. */
  showLevel?: boolean;
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
  className,
}: CharacterAvatarProps) {
  const art = characterClass ? getCharacterImage(characterClass, level) : null;

  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-white/10 bg-ink shadow-glow-sm",
          SIZES[size],
        )}
      >
        {art ? (
          <Image
            src={art}
            alt={characterClass ?? "Personagem"}
            fill
            sizes="80px"
            className="object-cover"
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
