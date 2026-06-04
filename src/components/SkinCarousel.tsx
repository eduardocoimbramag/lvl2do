"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Lock, Check, Sparkles } from "lucide-react";
import {
  SKIN_TIERS,
  getCharacterImageByTier,
  isSkinTierUnlocked,
  levelArtTier,
  skinTierLabel,
  type CharacterClass,
  type SkinTier,
} from "@/data/characterClasses";
import { cn } from "@/lib/utils";

interface SkinCarouselProps {
  /** classe do personagem (define quais artes mostrar). */
  characterClass: CharacterClass;
  /** nível atual — define o que está desbloqueado e qual é o tier "automático". */
  level: number;
  /** tier atualmente selecionado no carrossel. */
  selected: SkinTier;
  /** chamado ao escolher um tier (apenas tiers desbloqueados disparam). */
  onSelect: (tier: SkinTier) => void;
  /** desabilita a interação (ex.: durante o salvamento). */
  disabled?: boolean;
}

/**
 * Carrossel premium de skins do personagem.
 *
 * - Um slide por tier (Nível 1, 10, 25, 50, 100), com scroll-snap fluido.
 * - Setas + indicadores (dots) para navegar; também navega por scroll/swipe.
 * - O slide central recebe destaque (escala + glow + ring).
 * - Skins ainda não desbloqueadas aparecem em cinza, com cadeado e o nível
 *   necessário; clicar nelas não seleciona.
 * - O tier que corresponde ao nível atual ("automático") recebe um selo.
 */
export function SkinCarousel({
  characterClass,
  level,
  selected,
  onSelect,
  disabled,
}: SkinCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // bloqueia o handleScroll enquanto um scroll programático (setas/seleção)
  // está em andamento — evita que o índice ativo "pisque" durante a animação.
  const programmaticScroll = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTier = levelArtTier(level);

  // índice "central" visível, para destaque e estado das setas
  const initialIndex = Math.max(0, SKIN_TIERS.indexOf(selected));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  // espelho do activeIndex p/ callbacks estáveis (teclado) sem recriar a cada scroll
  const activeIndexRef = useRef(initialIndex);
  activeIndexRef.current = activeIndex;

  const tiers = useMemo(
    () =>
      SKIN_TIERS.map((tier) => ({
        tier,
        unlocked: isSkinTierUnlocked(level, tier),
        src: getCharacterImageByTier(characterClass, tier),
      })),
    [characterClass, level],
  );

  /**
   * Centraliza um slide pelo índice. Marca o scroll como programático e
   * mantém o índice ativo fixo até a animação assentar (evita o "piscar" do
   * destaque enquanto o smooth-scroll passa pelos slides intermediários).
   * Estável (sem deps) — não captura estado mutável.
   */
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const track = trackRef.current;
    const slide = slideRefs.current[index];
    if (!track || !slide) return;
    const left = slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2;

    programmaticScroll.current = true;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    track.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    // libera o handleScroll após a animação assentar (smooth ~400ms; instantâneo qd auto)
    settleTimer.current = setTimeout(
      () => {
        programmaticScroll.current = false;
      },
      smooth ? 450 : 60,
    );
  }, []);

  // ao (re)abrir / mudar a seleção externamente, centraliza sem animar.
  useEffect(() => {
    const idx = Math.max(0, SKIN_TIERS.indexOf(selected));
    setActiveIndex(idx);
    // espera o layout para medir offsets corretos
    const id = requestAnimationFrame(() => scrollToIndex(idx, false));
    return () => cancelAnimationFrame(id);
  }, [selected, characterClass, scrollToIndex]);

  // limpa o timer pendente ao desmontar
  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  /** Detecta o slide mais próximo do centro do track enquanto o usuário rola. */
  const handleScroll = useCallback(() => {
    // ignora eventos de scroll disparados por navegação programática (setas/seleção)
    if (programmaticScroll.current) return;
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const slideCenter = slide.offsetLeft + slide.clientWidth / 2;
      const dist = Math.abs(slideCenter - center);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    setActiveIndex(nearest);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(index, 0), SKIN_TIERS.length - 1);
      setActiveIndex(clamped);
      scrollToIndex(clamped);
    },
    [scrollToIndex],
  );

  const handlePick = useCallback(
    (index: number) => {
      const item = tiers[index];
      if (disabled) return;
      goTo(index);
      if (item.unlocked) onSelect(item.tier);
    },
    [tiers, disabled, goTo, onSelect],
  );

  // navegação por teclado (setas) — lê o índice atual via ref p/ manter o
  // callback estável (não recriar a cada scroll).
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(activeIndexRef.current - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(activeIndexRef.current + 1);
      }
    },
    [goTo],
  );

  const atStart = activeIndex <= 0;
  const atEnd = activeIndex >= SKIN_TIERS.length - 1;

  return (
    <div
      className="relative select-none"
      role="listbox"
      aria-label="Escolha a roupa do personagem"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* seta esquerda */}
      <CarouselArrow
        side="left"
        disabled={disabled || atStart}
        onClick={() => goTo(activeIndex - 1)}
      />

      {/* trilho com scroll-snap */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className={cn(
          "no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[28%] py-4 sm:px-[34%]",
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {tiers.map((item, i) => {
          const isActive = i === activeIndex;
          const isSelected = item.unlocked && selected === item.tier;
          const isAuto = item.tier === autoTier;
          return (
            <button
              key={item.tier}
              type="button"
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              onClick={() => handlePick(i)}
              disabled={disabled}
              aria-selected={isSelected}
              aria-label={`${skinTierLabel(item.tier)}${item.unlocked ? "" : " (bloqueada)"}`}
              className={cn(
                "relative aspect-square w-44 shrink-0 snap-center overflow-hidden rounded-2xl border bg-ink transition-all duration-300 sm:w-52",
                isActive
                  ? "scale-100 opacity-100"
                  : "scale-[0.86] opacity-50 hover:opacity-75",
                isSelected
                  ? "border-brand/70 shadow-glow"
                  : "border-white/[0.08]",
                disabled ? "cursor-not-allowed" : item.unlocked ? "cursor-pointer" : "cursor-not-allowed",
              )}
            >
              <Image
                src={item.src}
                alt={`${characterClass} — ${skinTierLabel(item.tier)}`}
                fill
                sizes="(max-width: 640px) 11rem, 13rem"
                className={cn(
                  "object-cover transition-all duration-300",
                  item.unlocked ? "" : "grayscale brightness-[0.45]",
                )}
              />

              {/* leve escurecido na base para legibilidade do rótulo */}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

              {/* ring quando selecionada */}
              {isSelected && (
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-brand/70" />
              )}

              {/* selo de selecionada */}
              {isSelected && (
                <span className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow-sm">
                  <Check size={14} />
                </span>
              )}

              {/* selo "Atual" (tier do nível atual) — quando não está selecionada */}
              {isAuto && !isSelected && item.unlocked && (
                <span className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/15 px-2 py-0.5 text-[10px] font-medium text-brand-light backdrop-blur-sm">
                  <Sparkles size={11} /> Atual
                </span>
              )}

              {/* overlay de bloqueada */}
              {!item.unlocked && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-black/30">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-soft backdrop-blur-sm">
                    <Lock size={16} />
                  </span>
                  <span className="text-[11px] font-medium text-white/80">
                    Nível {item.tier}
                  </span>
                </div>
              )}

              {/* rótulo do tier */}
              <div className="absolute inset-x-0 bottom-0 z-10 p-2.5 text-center">
                <p className="font-display text-sm font-semibold text-white drop-shadow">
                  {skinTierLabel(item.tier)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* seta direita */}
      <CarouselArrow
        side="right"
        disabled={disabled || atEnd}
        onClick={() => goTo(activeIndex + 1)}
      />

      {/* indicadores (dots) */}
      <div className="mt-1 flex items-center justify-center gap-2">
        {tiers.map((item, i) => (
          <button
            key={item.tier}
            type="button"
            aria-label={`Ir para ${skinTierLabel(item.tier)}`}
            onClick={() => goTo(i)}
            disabled={disabled}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === activeIndex ? "w-5 bg-brand" : "w-1.5 bg-white/20 hover:bg-white/40",
              !item.unlocked && i !== activeIndex && "bg-white/10",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Botão de seta lateral, posicionado sobre o trilho. */
function CarouselArrow({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled?: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.9 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Anterior" : "Próxima"}
      className={cn(
        "absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-ink-card/80 text-soft shadow-glow-sm backdrop-blur-md transition-all",
        side === "left" ? "left-1 sm:left-2" : "right-1 sm:right-2",
        disabled ? "pointer-events-none opacity-0" : "opacity-100 hover:border-brand/40 hover:text-brand-light",
      )}
    >
      <Icon size={18} />
    </motion.button>
  );
}
