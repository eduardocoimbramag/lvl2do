"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  animate,
  motion,
  AnimatePresence,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";
import { Heart, Swords, RotateCcw, UserRound } from "lucide-react";
import { bossMeta } from "@/data/bosses";
import { bossLeadingInk, HERO_TRAILING_INK } from "@/data/spriteInk";
import {
  ATTACK,
  EASE_ADVANCE,
  EASE_HOUSE,
  EASE_LUNGE,
  gaitKeyframes,
} from "@/lib/animations";
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
  /** muda a cada investida; null = repouso. */
  attackId?: number | null;
  /** contato: aplica o estado do servidor e diz se ainda há golpe na fila. */
  onHit?: () => boolean;
  /** fim da investida (ou watchdog). */
  onSettled?: () => void;
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
  attackId = null,
  onHit,
  onSettled,
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

  /* ------------------------- coreografia do ataque ------------------------ */

  const stageRef = useRef<HTMLElement | null>(null);
  const runRef = useRef(0);
  const controlsRef = useRef<AnimationPlaybackControls[]>([]);
  const onHitRef = useRef(onHit);
  onHitRef.current = onHit;
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    if (attackId === null) return;
    const myRun = ++runRef.current;
    const vivo = () => runRef.current === myRun;
    const stage = stageRef.current;
    const q = <T extends HTMLElement>(sel: string) => stage?.querySelector<T>(sel) ?? null;

    const anchor = q("[data-hero-anchor]");
    const walker = q("[data-hero-walker]");
    const gait = q("[data-hero-gait]");
    const shadow = q("[data-hero-shadow]");
    const bossAnchor = q("[data-boss-anchor]");
    const bossSprite = q("[data-boss-sprite]");
    if (!anchor || !walker || !gait || !shadow || !bossAnchor || !bossSprite) {
      onSettledRef.current?.();
      return;
    }

    // `animate` de módulo, não o escopado de useAnimate: o escopado empilha
    // controles num array que nunca esvazia, e são ~12 por ataque × 3 cards.
    // Aqui a lista é nossa e morre com o run.
    const track = (c: AnimationPlaybackControls) => {
      controlsRef.current.push(c);
      return c;
    };

    // Distância medida em TINTA. O vão transparente é ~22% no herói e até 8% no
    // boss: medir só a caixa deixaria o golpe acertando ar.
    const hb = anchor.getBoundingClientRect();
    const bb = bossAnchor.getBoundingClientRect();
    const vao =
      bb.left + bb.width * bossLeadingInk(meta.image) - (hb.right - hb.width * HERO_TRAILING_INK);
    const walkX = Math.max(0, vao - ATTACK.contactOverlapPx);
    const steps = Math.min(
      ATTACK.maxSteps,
      Math.max(ATTACK.minSteps, Math.round(walkX / ATTACK.stepPx)),
    );
    const avanco = steps * ATTACK.stepDuration;
    const volta = avanco * ATTACK.returnRatio;

    const passada = (bob: number) => ({
      corpo: gaitKeyframes(steps, 0, -bob),
      sy: gaitKeyframes(steps, 0.97, 1.02),
      sx: gaitKeyframes(steps, 1.03, 0.99),
      shS: gaitKeyframes(steps, 1, 0.84),
      shO: gaitKeyframes(steps, ATTACK.shadowRest, ATTACK.shadowApex),
    });
    const espera = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    void (async () => {
      // 1. ANTECIPAÇÃO — os 140ms que separam "personagem" de "imagem deslizando"
      track(animate(gait, { rotate: -2, scaleY: 0.96 }, { duration: ATTACK.anticipation }));
      await track(
        animate(walker, { x: -ATTACK.anticipationPx },
          { duration: ATTACK.anticipation, ease: EASE_HOUSE }),
      );
      if (!vivo()) return;

      // 2. AVANÇO — canais paralelos com os MESMOS times, então nada sai de fase
      const p = passada(ATTACK.bobPx);
      track(animate(gait, { y: p.corpo.values, scaleY: p.sy.values, scaleX: p.sx.values },
        { duration: avanco, times: p.corpo.times, ease: "easeInOut" }));
      track(animate(gait, { rotate: ATTACK.leanFwd }, { duration: 0.18, ease: EASE_HOUSE }));
      track(animate(shadow, { scaleX: p.shS.values, opacity: p.shO.values },
        { duration: avanco, times: p.shS.times, ease: "easeInOut" }));
      // sem ease-out: quem freia o herói é o boss, não a curva
      await track(animate(walker, { x: walkX }, { duration: avanco, ease: EASE_ADVANCE }));
      if (!vivo()) return;

      // 3. ESTOCADAS — uma por missão concluída. Três conclusões viram três
      // golpes de -2, nunca um "-6": o jogo é "1 missão = 1 golpe".
      let mais = true;
      let primeira = true;
      while (mais && vivo()) {
        if (!primeira) {
          await track(animate(walker, { x: walkX }, { duration: ATTACK.lunge, ease: EASE_HOUSE }));
          await espera(ATTACK.multiBeatMs);
          if (!vivo()) return;
        }
        track(animate(shadow, { scaleX: 1.12 }, { duration: ATTACK.lunge }));
        await track(animate(walker, { x: walkX + ATTACK.lungePx },
          { duration: ATTACK.lunge, ease: EASE_LUNGE }));
        if (!vivo()) return;

        // CONTATO: aqui — e só aqui — a verdade do servidor entra na tela.
        mais = onHitRef.current?.() ?? false;

        track(animate(bossSprite, { x: [0, ATTACK.bossRecoilPx, 0], rotate: [0, 2.5, 0] },
          { duration: ATTACK.bossRecoil, times: [0, 0.18, 1], ease: EASE_HOUSE }));
        const flash = q("[data-boss-flash]");
        if (flash) {
          track(animate(flash, { opacity: [0, 0.85, 0] },
            { duration: ATTACK.flash, times: [0, 0.25, 1], ease: "linear" }));
        }
        primeira = false;
      }

      // 4. HITSTOP — o impacto pesa pelo que vem depois. Custo zero: é só não animar.
      await espera(ATTACK.hitstopMs);
      if (!vivo()) return;

      // 5. RETORNO — de costas, ainda encarando o boss. Não se vira as costas a
      // um chefe vivo; o recuo é vendido pelo lean invertido e pelo bob cheio.
      const r = passada(ATTACK.bobPx);
      track(animate(gait, { y: r.corpo.values, scaleY: r.sy.values, scaleX: r.sx.values },
        { duration: volta, times: r.corpo.times, ease: "easeInOut" }));
      track(animate(gait, { rotate: ATTACK.leanBack }, { duration: 0.18, ease: EASE_HOUSE }));
      track(animate(shadow, { scaleX: r.shS.values, opacity: r.shO.values },
        { duration: volta, times: r.shS.times, ease: "easeInOut" }));
      await track(animate(walker, { x: 0 }, { duration: volta, ease: EASE_HOUSE }));
      if (!vivo()) return;

      // 6. ASSENTAMENTO
      track(animate(shadow, { scaleX: 1, opacity: ATTACK.shadowRest },
        { duration: ATTACK.settle }));
      await track(animate(gait, { rotate: 0, y: 0, scaleX: 1, scaleY: 1 },
        { duration: ATTACK.settle, ease: EASE_HOUSE }));
      if (!vivo()) return;
      onSettledRef.current?.();
    })();

    return () => {
      runRef.current++; // invalida o run em voo
      for (const c of controlsRef.current) c.stop();
      controlsRef.current = [];
      if (!stageRef.current) return; // desmontou: nada a assentar
      // aborto ou troca de rota: volta ao repouso sem salto
      animate(walker, { x: 0 }, { duration: 0.2, ease: EASE_HOUSE });
      animate(gait, { y: 0, rotate: 0, scaleX: 1, scaleY: 1 }, { duration: 0.2 });
      animate(shadow, { scaleX: 1, opacity: ATTACK.shadowRest }, { duration: 0.2 });
    };
    // meta.image é estável por categoria; reagir só ao attackId é o objetivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackId]);

  /**
   * Sombra elíptica sob os pés. Usa `bg-black` + `opacity-[0.55]` e NÃO
   * `bg-black/55`: a caminhada anima `opacity`, e com o alpha embutido na cor o
   * primeiro keyframe saltaria de 1 para 0.55 e a sombra ficaria clara para
   * sempre depois do primeiro ataque.
   */
  const groundShadow = (marca?: boolean) => (
    <motion.div
      {...(marca ? { "data-hero-shadow": "" } : {})}
      aria-hidden
      className="absolute inset-x-[14%] bottom-[6%] h-2.5 rounded-[100%] bg-black opacity-[0.55] blur-[5px]"
    />
  );

  return (
    <section
      ref={stageRef}
      data-boss-arena={category}
      className="card-surface relative h-56 overflow-hidden lg:h-52"
    >
      <Image
        src={meta.scene}
        alt=""
        aria-hidden
        fill
        sizes="(min-width: 1024px) 33vw, 100vw"
        className="object-cover"
      />

      {/* Scrim inferior: os indicadores são texto claro e o cenário do orc é
          neve — sem isto, "3/5" some no branco. Vem antes dos sprites no DOM
          para ficar atrás deles. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/90 via-ink/45 to-transparent"
      />

      {/* nome do boss, com scrim para legibilidade sobre qualquer cenário */}
      <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-ink/80 via-ink/25 to-transparent px-4 pb-7 pt-3">
        <h3 className="truncate font-display text-sm font-semibold tracking-wide text-soft drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {meta.name}
        </h3>
      </div>

      {/* ---------- PERSONAGEM (esquerda) + ataques do dia ---------- */}
      <div className="absolute bottom-3 left-[4%] flex w-[30%] max-w-[132px] flex-col items-center">
        {/* âncora parada: é ela que medimos. O walker carrega o x, e medir nele
            daria distância errada se um run anterior ainda estivesse voltando. */}
        <div data-hero-anchor className="relative w-full">
          <motion.div data-hero-walker className="relative w-full">
            {/* sombra é FILHA do walker: viaja junto de graça */}
            {groundShadow(true)}
            {/* origem no pé: sem isso scaleY/rotate levantam a base e o
                personagem flutua — mesmo cuidado que a respiração já toma */}
            <motion.div data-hero-gait className="w-full" style={{ transformOrigin: "50% 100%" }}>
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
            </motion.div>
          </motion.div>
        </div>

        {/* ataques restantes hoje. Fora do walker: é HUD do jogador. */}
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
        <div data-boss-anchor className="relative w-full">
          {/* fora do sprite: a sombra fica plantada durante o recuo */}
          {groundShadow()}
          <motion.div
            data-boss-sprite
            className="relative w-full"
            style={{ transformOrigin: "50% 100%" }}
          >
            {/* clarão do impacto, recortado pela silhueta do boss */}
            <motion.div
              data-boss-flash
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 bg-white opacity-0 mix-blend-overlay"
              style={{
                maskImage: `url(${meta.image})`,
                WebkitMaskImage: `url(${meta.image})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
              }}
            />
            {/* respiração por dentro do recuo: um não interrompe o outro */}
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
