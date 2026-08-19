"use client";

import Image from "next/image";
import { CharacterBackdrop } from "./CharacterBackdrop";
import type { CharacterBackgroundId } from "@/data/characterBackgrounds";
import { cn } from "@/lib/utils";

interface CharacterFrameProps {
  /** arte já resolvida (respeitando a skin). null → mostra o `fallback`. */
  artSrc: string | null;
  alt: string;
  background: CharacterBackgroundId;
  /** `sizes` do next/image — depende de onde a moldura é usada. */
  sizes?: string;
  /** conteúdo quando não há arte (ex.: inicial do nome, nível). */
  fallback?: React.ReactNode;
  /** tamanho e raio da moldura vêm de fora. */
  className?: string;
}

/**
 * Moldura do personagem: cenário atrás, arte por cima.
 *
 * Existe para o Perfil e o Dashboard não divergirem — o fundo é preferência do
 * usuário e precisa aparecer igual nos dois. `bg-ink` continua embaixo de tudo
 * como piso: é o que se vê no fundo "Padrão" e enquanto o cenário não pinta.
 */
export function CharacterFrame({
  artSrc,
  alt,
  background,
  sizes = "(max-width: 640px) 9rem, 11rem",
  fallback,
  className,
}: CharacterFrameProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-white/10 bg-ink shadow-glow",
        className,
      )}
    >
      <CharacterBackdrop background={background} />

      {artSrc ? (
        <Image src={artSrc} alt={alt} fill sizes={sizes} className="relative object-cover" />
      ) : (
        fallback
      )}
    </div>
  );
}
