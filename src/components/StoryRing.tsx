"use client";

import { Plus } from "lucide-react";
import { CharacterAvatar } from "./CharacterAvatar";
import type { StoryRing as StoryRingData } from "@/data/stories";
import { cn } from "@/lib/utils";

interface StoryRingProps {
  ring: StoryRingData;
  /** item do próprio usuário: anel com vocabulário próprio + botão "+" ao lado. */
  isOwn?: boolean;
  /** abre o visualizador. Ausente quando o autor ainda não tem story. */
  onOpen?: () => void;
  /** abre o compositor (só no item próprio). */
  onCompose?: () => void;
}

/**
 * Um item do trilho de stories: anel + avatar circular + rótulo.
 *
 * O anel são duas camadas concêntricas — a externa é o traço colorido, a
 * interna é o respiro na cor do fundo. A geometria é idêntica em todos os
 * estados de propósito: mudar espessura junto com a cor faria o trilho inteiro
 * tremer quando um story virasse "visto".
 *
 * O item PRÓPRIO não usa o par roxo/cinza. Cinza significa "já visualizado", e
 * o seu próprio story nasceria cinza (você nunca é contado como espectador) —
 * o que colidiria com o significado. Ele tem três estados só dele: tracejado
 * (sem story), anel suave (com story) e o "+" sempre ao lado.
 */
export function StoryRing({ ring, isOwn = false, onOpen, onCompose }: StoryRingProps) {
  const { author, hasUnseen, stories } = ring;
  const hasStories = stories.length > 0;
  const unseen = !isOwn && hasStories && hasUnseen;
  const dimmed = !isOwn && hasStories && !hasUnseen;

  // Sem story próprio, tocar o anel leva direto para publicar.
  const handlePress = hasStories ? onOpen : isOwn ? onCompose : undefined;

  const label = isOwn
    ? hasStories
      ? `Seu story — ${stories.length} ${stories.length === 1 ? "publicação" : "publicações"}`
      : "Publicar seu primeiro story"
    : `Story de ${author.name}, ${unseen ? "não visualizado" : "já visualizado"}`;

  const avatar = (
    <CharacterAvatar
      characterClass={author.characterClass}
      level={author.level}
      size="story"
      shape="circle"
      showLevel={false}
      className={cn(dimmed && "opacity-60 grayscale-[45%]")}
    />
  );

  const ringButton = (
    <button
      type="button"
      onClick={handlePress}
      aria-label={label}
      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
    >
      <span
        className={cn(
          "block rounded-full p-[2px] transition-colors duration-300 sm:p-[3px]",
          isOwn
            ? hasStories
              ? "bg-story-ring opacity-60"
              : "bg-transparent"
            : unseen
              ? "bg-story-ring shadow-glow-sm"
              : // 3:1 de contraste sobre o fundo (WCAG 1.4.11). white/15 dava 1,45:1.
                "bg-white/40",
        )}
      >
        <span
          className={cn(
            "block rounded-full bg-ink p-[3px]",
            isOwn && !hasStories && "border-2 border-dashed border-white/20",
          )}
        >
          {avatar}
        </span>
      </span>
    </button>
  );

  if (isOwn) {
    return (
      <div className="flex w-[104px] shrink-0 flex-col items-center gap-1.5 sm:w-[120px]">
        <div className="flex items-center gap-2">
          {ringButton}
          {/* à DIREITA do ícone, fora da silhueta do anel */}
          <button
            type="button"
            onClick={onCompose}
            aria-label="Publicar story"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-brand-gradient shadow-glow-sm transition-transform duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:h-8 sm:w-8"
          >
            <Plus size={15} strokeWidth={3} className="text-white" />
          </button>
        </div>
        <span className="w-full truncate text-center text-[11px] leading-tight text-soft sm:text-xs">
          Seu story
        </span>
      </div>
    );
  }

  return (
    <div className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 sm:w-[84px]">
      {ringButton}
      <span
        className={cn(
          "w-full truncate text-center text-[11px] leading-tight sm:text-xs",
          unseen ? "text-soft" : "text-muted",
        )}
      >
        {author.name}
      </span>
    </div>
  );
}
