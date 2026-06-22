"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import {
  CHARACTER_CLASSES,
  getClassShowcaseImage,
  type CharacterClassMeta,
} from "@/data/characterClasses";
import { fadeUp, inViewport, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * Seção "Escolha sua classe" — 30/70.
 * Esquerda: título + descrição. Direita: duas fileiras de cards de classe
 * em rolagem infinita (marquee), em sentidos opostos — como se passasse por todas.
 *
 * A mídia da direita é um placeholder funcional usando as artes das classes;
 * pode ser trocada depois pela mídia definitiva.
 */
export function ClassShowcase() {
  const rowTop = CHARACTER_CLASSES;
  const rowBottom = [...CHARACTER_CLASSES].reverse();

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={inViewport}
      className="grid items-center gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:gap-14"
    >
      {/* ---------------- ESQUERDA (30%) ---------------- */}
      <motion.div variants={fadeUp}>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand-light">
          <Sparkles size={13} /> +30 classes
        </span>
        <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-soft sm:text-4xl">
          Escolha sua <span className="text-gradient">classe</span>
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Escolha entre mais de 30 classes, monte sua identidade e avance em uma rotina que evolui
          junto com seu personagem. Cada personagem carrega uma forma diferente de enfrentar o dia.
        </p>
      </motion.div>

      {/* ---------------- DIREITA (70%) — marquee ---------------- */}
      <motion.div
        variants={fadeUp}
        aria-hidden="true"
        className="relative overflow-hidden"
      >
        {/* máscaras de borda para o fade premium */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-ink to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-ink to-transparent sm:w-24" />

        <div className="flex flex-col gap-4">
          <MarqueeRow items={rowTop} direction="normal" />
          <MarqueeRow items={rowBottom} direction="reverse" />
        </div>
      </motion.div>
    </motion.div>
  );
}

function MarqueeRow({
  items,
  direction,
}: {
  items: CharacterClassMeta[];
  direction: "normal" | "reverse";
}) {
  return (
    <div className="flex">
      {/* itens duplicados → loop perfeito em -50% (cada card carrega seu próprio mr) */}
      <div
        className={cn(
          "flex w-max hover:[animation-play-state:paused]",
          direction === "normal" ? "animate-marquee" : "animate-marquee-reverse",
        )}
      >
        {[...items, ...items].map((meta, i) => (
          <ClassCard key={`${meta.id}-${i}`} meta={meta} />
        ))}
      </div>
    </div>
  );
}

function ClassCard({ meta }: { meta: CharacterClassMeta }) {
  const Icon = meta.icon;
  return (
    <div className="group relative mr-4 h-56 w-40 shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-card shadow-card transition-all duration-300 hover:border-brand/40 hover:shadow-glow sm:h-64 sm:w-48">
      <Image
        src={getClassShowcaseImage(meta.id)}
        alt={`Classe ${meta.id}`}
        fill
        sizes="(max-width: 640px) 160px, 192px"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* escurecido na base para legibilidade */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* chip do ícone com o acento da classe */}
      <span
        className={cn(
          "absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-sm",
          meta.accent,
        )}
      >
        <Icon size={16} />
      </span>

      {/* nome + tagline */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="font-display text-base font-semibold text-soft">{meta.id}</h3>
        <p className="text-xs text-muted">{meta.tagline}</p>
      </div>
    </div>
  );
}
