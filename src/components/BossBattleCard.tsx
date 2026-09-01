"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Heart, Swords, RotateCcw, UserRound } from "lucide-react";
import { CharacterBackdrop } from "./CharacterBackdrop";
import { bossMeta } from "@/data/bosses";
import type { Category } from "@/data/types";
import type { BossBattleState } from "@/types/database";
import type { BossBattlesStatus } from "@/hooks/useBossBattles";
import { cn } from "@/lib/utils";

/**
 * Baú de tesouro. O requisito pede "um TESOURO em cima" do botão; o lucide não
 * tem baú e Gem/Coins não leem como tesouro. Herda currentColor do botão.
 */
function TreasureChestIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 10V8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2H3Z" />
      <path d="M3 10h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8Z" />
      <rect x="10" y="8" width="4" height="5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface BossBattleCardProps {
  category: Category;
  /** null = carregando/erro → indicadores em placeholder. */
  boss: BossBattleState | null;
  status: BossBattlesStatus;
  /** null = usuário ainda sem classe → silhueta no lugar do herói. */
  characterImage: string | null;
  characterLabel: string | null;
  onCollect: () => void;
  collecting: boolean;
  onRetry: () => void;
}

/**
 * Arena TBH de UMA área: cenário, personagem do jogador (esquerda, espelhado
 * para encarar o inimigo), boss (direita, maior) e os dois indicadores dentro
 * da própria cena — vida sob o boss, ataques do dia sob o personagem.
 *
 * Sem rótulo de área de propósito: cada arena fica exatamente sob a coluna da
 * sua categoria, então repetir o nome seria ruído.
 *
 * Presentacional puro — todo o estado vem do BossBattleRow.
 */
export function BossBattleCard({
  category,
  boss,
  status,
  characterImage,
  characterLabel,
  onCollect,
  collecting,
  onRetry,
}: BossBattleCardProps) {
  const meta = bossMeta[category];
  const hp = boss?.hp ?? null;
  const dead = hp === 0;
  const hits = boss?.hits_today ?? null;
  // OBRIGATÓRIO framer: globals.css zera só animação CSS sob reduced-motion,
  // não motion values. null = SSR (lá nada anima); tratar como false é correto.
  const reduce = useReducedMotion();

  // Número flutuante "-2" quando o hp cai entre fetches. Registrado: não é
  // animação de ataque — é a legibilidade da vida descendo (2% é invisível
  // sozinho). Para o literal estrito, apagar este estado + o <AnimatePresence>.
  const [floatingHit, setFloatingHit] = useState<{ id: number; dmg: number } | null>(null);
  const [srAnnouncement, setSrAnnouncement] = useState("");
  const prevHp = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevHp.current;
    if (hp !== null && prev !== null && hp < prev) {
      setFloatingHit({ id: Date.now(), dmg: prev - hp });
      setSrAnnouncement(`${meta.name} sofreu ${prev - hp} de dano — ${hp}/100`);
    }
    if (hp !== null) prevHp.current = hp;
  }, [hp, meta.name]);

  // Respiração com origem no pé (peito expande, pés plantados); durações não
  // múltiplas (3.8 × 2.9) para os dois nunca sincronizarem. Sem ataque.
  // Morto/reduced: animar ATÉ o repouso, nunca `undefined` — undefined congela
  // o frame corrente (o boss morreria "inflado" no meio do ciclo).
  const breatheBoss = {
    style: { transformOrigin: "50% 100%" as const },
    animate: reduce || dead ? { y: 0, scale: 1 } : { y: [0, -2, 0], scale: [1, 1.015, 1] },
    transition: { duration: 3.8, repeat: reduce || dead ? 0 : Infinity, ease: "easeInOut" as const },
  };
  const breatheHero = {
    style: { transformOrigin: "50% 100%" as const },
    animate: reduce ? { y: 0, scale: 1 } : { y: [0, -2.5, 0], scale: [1, 1.02, 1] },
    transition: { duration: 2.9, repeat: reduce ? 0 : Infinity, ease: "easeInOut" as const },
  };

  // Tier por quarto de vida: coração e número herdam a MESMA classe, então é
  // impossível dessincronizar. Dano par (2) torna 75/50/25 inatingíveis exatos.
  const hpTier =
    hp === null
      ? "text-muted"
      : hp > 75
        ? "text-lime-400"
        : hp > 50
          ? "text-yellow-400"
          : hp > 25
            ? "text-orange-400"
            : "text-red-400"; // red-400, não 500: contraste sobre o cenário

  /** Sombra elíptica sob os pés — fica no chão enquanto o corpo respira. */
  const groundShadow = (
    <div
      aria-hidden
      className="absolute inset-x-[14%] bottom-[6%] h-2.5 rounded-[100%] bg-black/55 blur-[5px]"
    />
  );

  return (
    <section className="card-surface relative h-56 overflow-hidden lg:h-52">
      <CharacterBackdrop background={meta.backdrop} />

      {/* nome do boss, com scrim para legibilidade sobre qualquer cenário */}
      <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-ink/80 via-ink/25 to-transparent px-4 pb-7 pt-3">
        <h3 className="truncate font-display text-sm font-semibold tracking-wide text-soft drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {meta.name}
        </h3>
      </div>

      {/* ---------- PERSONAGEM (esquerda) + ataques do dia ---------- */}
      <div className="absolute bottom-3 left-[4%] flex w-[30%] max-w-[132px] flex-col items-center">
        <div className="relative w-full">
          {groundShadow}
          <motion.div className="w-full" {...breatheHero}>
            {characterImage ? (
              <Image
                src={characterImage}
                alt={`Seu personagem, ${characterLabel}`}
                width={800}
                height={800}
                sizes="(min-width: 480px) 132px, 32vw"
                // espelhado: a arte olha/aponta a arma para a direita, onde está o boss
                className="pointer-events-none h-auto w-full -scale-x-100 select-none drop-shadow-[0_10px_16px_rgba(0,0,0,0.5)]"
              />
            ) : (
              // borda quase inalcançável (o guard de classe redireciona antes) —
              // mas o card nunca some: boss e vida funcionam sem classe.
              <div className="flex flex-col items-center gap-1 pb-2 opacity-40">
                <UserRound className="h-12 w-12 text-muted" />
                <span className="text-[10px] leading-tight text-muted">Escolha sua classe</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* ataques restantes hoje — espada à esquerda, contagem à direita */}
        <div
          role="img"
          aria-label={hits === null ? "golpes de hoje carregando" : `${hits} de 5 golpes dados hoje`}
          className="mt-1 flex items-center gap-1.5 text-soft drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
        >
          <Swords size={13} aria-hidden className={cn(hits !== null && hits >= 5 && "text-muted")} />
          <span
            className={cn(
              "font-display text-xs font-semibold tabular-nums",
              hits !== null && hits >= 5 && "text-muted",
            )}
          >
            {hits === null ? "—/5" : `${hits}/5`}
          </span>
        </div>
      </div>

      {/* ---------- BOSS (direita) + vida ---------- */}
      <div className="absolute bottom-3 right-[3%] flex w-[38%] max-w-[168px] flex-col items-center">
        <div className="relative w-full">
          {groundShadow}
          <motion.div className="w-full" {...breatheBoss}>
            <Image
              src={meta.image}
              alt={`${meta.name} — chefe da área ${category}`}
              width={1254}
              height={1254}
              sizes="(min-width: 480px) 168px, 40vw"
              className={cn(
                "pointer-events-none h-auto w-full select-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]",
                dead && "opacity-40 grayscale",
              )}
            />
          </motion.div>
        </div>

        {/* vida do boss — coração à esquerda, "X/100" à direita */}
        {status === "error" && !boss ? (
          <button
            onClick={onRetry}
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] transition-colors hover:text-soft"
          >
            <RotateCcw size={12} aria-hidden /> Tentar de novo
          </button>
        ) : (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={hp ?? undefined}
            aria-valuetext={hp === null ? "carregando" : `${hp} de 100`}
            aria-label={`Vida de ${meta.name}`}
            className={cn(
              "mt-1 flex items-center gap-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] transition-colors duration-500",
              hpTier,
            )}
          >
            <Heart size={13} aria-hidden className="fill-current" />
            <span className="font-display text-xs font-semibold tabular-nums">
              {hp === null ? "—/100" : `${hp}/100`}
            </span>
          </div>
        )}
      </div>

      {/* número flutuante de dano, sobre o boss (agora à direita) */}
      <AnimatePresence>
        {floatingHit && !reduce && (
          <motion.span
            key={floatingHit.id}
            aria-hidden
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: -26 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            onAnimationComplete={() => setFloatingHit(null)}
            className="absolute right-[16%] top-[20%] z-10 font-display text-lg font-bold text-red-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
          >
            -{floatingHit.dmg}
          </motion.span>
        )}
      </AnimatePresence>

      {/* MORTE: boss petrificado + overlay. Cobre o nome no topo (z-20 > z-10),
          por isso o nome é repetido aqui dentro. */}
      {dead && (
        <div
          role="status"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-ink/60 backdrop-blur-[2px]"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-light">
            {meta.name} derrotado
          </span>
          <div className="relative">
            <div aria-hidden className="absolute -inset-3 rounded-3xl bg-brand/30 blur-xl animate-pulse-glow" />
            <button
              onClick={onCollect}
              disabled={collecting}
              className="relative flex flex-col items-center gap-1.5 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
            >
              <TreasureChestIcon size={22} />
              Coletar tesouro e resetar boss
            </button>
          </div>
        </div>
      )}

      {/* live region para leitores de tela, atualizada quando o hp cai */}
      <span className="sr-only" role="status">
        {srAnnouncement}
      </span>
    </section>
  );
}
