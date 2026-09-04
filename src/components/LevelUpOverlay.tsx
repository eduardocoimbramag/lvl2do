"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";
import { ModalPortal } from "./ModalPortal";
import { Button } from "./Button";
import { EASE_HOUSE, EASE_TRAVEL } from "@/lib/animations";
import { LU, LU_SETTLE_MS, LU_STARS, levelUpTimings } from "@/lib/levelUpChoreography";
import { lockAppShell } from "@/lib/overlayLock";
import { cn } from "@/lib/utils";

/** Duas metades espelhadas do MESMO ponto às 9h, chegando juntas às 3h (r=180). */
const RING = {
  top: "M 20 200 A 180 180 0 0 1 380 200",
  bot: "M 20 200 A 180 180 0 0 0 380 200",
};

const rootVariants: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1 },
  // O desfoque levanta DEPOIS do conteúdo: se subisse junto, o app nítido
  // reapareceria atrás de elementos ainda visíveis e leria como bug.
  gone: (T: { backdrop: number; backdropDelay: number }) => ({
    opacity: 0,
    transition: { duration: T.backdrop, delay: T.backdropDelay, ease: EASE_HOUSE },
  }),
};

/**
 * UMA única escala na saída. Duas aninhadas (1,08 × 0,96) se cancelavam em 1,04.
 *
 * Aplicado DIRETAMENTE no palco e no bloco de texto, e não num wrapper
 * `display: contents`: um elemento com `display: contents` não gera caixa, logo
 * `opacity` e `scale` nele seriam silenciosamente inertes e a saída do conteúdo
 * não aconteceria. Como os dois nós são irmãos e cada um é uma linha do grid, o
 * layout é idêntico e a animação passa a existir de verdade. As labels de
 * variante ("shown"/"gone") descem da raiz automaticamente.
 */
const contentVariants: Variants = {
  hidden: {},
  shown: {},
  gone: (T: { content: number }) => ({
    opacity: 0,
    scale: 1.07,
    transition: { duration: T.content, ease: EASE_HOUSE },
  }),
};

interface LevelUpOverlayProps {
  /** montado sempre: é o que permite a animação de saída do AnimatePresence. */
  open: boolean;
  /** nível ALCANÇADO — o número exibido e a base da arte. */
  level: number;
  /** nível de PARTIDA — `level - fromLevel` é o delta. */
  fromLevel: number;
  /** XP creditado no evento (0 em simulação/recuperação). */
  xp: number;
  /** XP que ainda falta para o próximo nível (0 = não exibir). */
  xpToNext: number;
  wasCapped: boolean;
  reachedDailyLimit: boolean;
  /** arte já resolvida por useCharacterSkin.resolveImage. null = sem classe. */
  artSrc: string | null;
  /** arte do nível de partida. Difere de artSrc ⇒ há cross-fade. */
  prevArtSrc: string | null;
  /** a FAIXA de arte mudou (10/25/50/100) — independe de a skin estar fixada. */
  crossedTier: boolean;
  /** rótulo da faixa desbloqueada, ex.: "Nível 25". */
  tierLabel: string | null;
  /** próxima faixa ainda não alcançada, para o "por que isso importa". */
  nextTierLevel: number | null;
  /** true = pré-visualização da Área de ADM (marca a tela e não grava nada). */
  preview: boolean;
  /** ÚNICO caminho de fechamento: "Confirmar", Esc e voltar do Android. */
  onConfirm: () => void;
}

/**
 * Celebração de subida de nível em tela cheia.
 *
 * Composição: fundo desfocado → arco varrendo da esquerda para a direita na cor
 * da barra de XP → estrelas acendendo NA ESTEIRA do arco → personagem ao centro
 * exato da viewport → chapa de nível na base do anel → texto → "Confirmar".
 *
 * Assenta em ~1,7 s; a ação fica visível em 1,34 s. Nada bloqueia.
 */
export function LevelUpOverlay({
  open,
  level,
  fromLevel,
  xp,
  xpToNext,
  wasCapped,
  reachedDailyLimit,
  artSrc,
  prevArtSrc,
  crossedTier,
  tierLabel,
  nextTierLevel,
  preview,
  onConfirm,
}: LevelUpOverlayProps) {
  // useReducedMotion devolve boolean | null (null no SSR); null é "não".
  const reduce = useReducedMotion() === true;
  const T = levelUpTimings(reduce);

  const rootRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const popped = useRef(false);
  const pushed = useRef(false);

  /**
   * Ref sempre-atual do onConfirm.
   *
   * `dismissLevelUp` é um useCallback com dep `[levelUp]`, então TROCA DE
   * IDENTIDADE quando dois ganhos coalescem com o overlay já aberto. Se os
   * efeitos de popstate/Esc dependessem dele, o cleanup rodaria
   * `history.back()` e o listener recém-registrado capturaria esse mesmo
   * popstate — fechando a celebração sozinha, no meio dela. Com a ref, os
   * efeitos dependem só de `open` e são montados uma única vez.
   */
  const confirmRef = useRef(onConfirm);
  useEffect(() => {
    confirmRef.current = onConfirm;
  });

  const levelDelta = Math.max(1, level - fromLevel);
  const swapsArt = !!artSrc && !!prevArtSrc && artSrc !== prevArtSrc;
  const [artFailed, setArtFailed] = useState(false);
  const showArt = !!artSrc && !artFailed;

  /**
   * O nó fica montado durante a animação de SAÍDA. Amarrar a trava a `open`
   * soltaria scroll, `inert` e foco 240–300 ms cedo demais — com o overlay
   * ainda 100% visível o fundo voltava a rolar e a ser tabável.
   */
  const [inDom, setInDom] = useState(false);
  useEffect(() => {
    if (open) setInDom(true);
  }, [open]);

  /* --------------------- driver único: arco + cometa ---------------------- */
  const progress = useMotionValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!open) return;
    if (reduce) {
      progress.set(1); // desenhado COMPLETO, sem varredura
      return;
    }
    progress.set(0);
    const c = animate(progress, 1, {
      duration: LU.arc.dur,
      delay: LU.arc.at,
      ease: EASE_TRAVEL,
    });
    return () => c.stop();
  }, [open, reduce, progress]);

  /* ------- as estrelas assentam: o overlay pode ficar aberto por minutos --- */
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!open || reduce) return;
    setSettled(false);
    const t = setTimeout(() => setSettled(true), LU_SETTLE_MS);
    return () => clearTimeout(t);
  }, [open, reduce]);

  /* -------- o botão só fica clicável quando fica visível (1,34 s) --------- */
  const [ready, setReady] = useState(reduce);
  useEffect(() => {
    if (!open) return;
    if (reduce) {
      setReady(true);
      return;
    }
    setReady(false);
    const t = setTimeout(() => setReady(true), T.button.at * 1000);
    return () => clearTimeout(t);
  }, [open, reduce, T.button.at]);

  /* ------------ trava de shell: scroll + inert em TODOS os irmãos --------- */
  useEffect(() => {
    if (!inDom) return;
    return lockAppShell(rootRef.current);
  }, [inDom]);

  /* ------- Android: "voltar" fecha o overlay, não sai da página ----------- */
  useEffect(() => {
    if (!open) return;
    // StrictMode monta o efeito duas vezes em dev: sem esta guarda o par
    // push → back → push gera um evento de rota espúrio no App Router.
    if (!pushed.current) {
      pushed.current = true;
      history.pushState({ levelUp: true }, "");
    }
    const onPop = () => {
      popped.current = true;
      confirmRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!popped.current && history.state?.levelUp) history.back();
      popped.current = false;
      pushed.current = false;
    };
  }, [open]);

  /* -- foco: NO CONTÊINER, não no botão; cleanup roda POR ÚLTIMO ----------- */
  useEffect(() => {
    if (!inDom) return;
    const opener = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => opener?.focus?.();
  }, [inDom]);

  /** Esc por listener de janela: funciona mesmo se o foco escapar. */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") confirmRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /**
   * Armadilha de foco REAL. A tela tem exatamente um controle, então a
   * armadilha é trivial: qualquer Tab devolve o foco ao "Confirmar".
   * Com `inert` em todos os irmãos, não há mais nada focável no documento.
   */
  function onRootKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    actionRef.current?.querySelector("button")?.focus();
  }

  const heading = "Você subiu de nível";
  const primaryLine = preview
    ? `Pré-visualização · Nível ${fromLevel} → ${level}`
    : levelDelta > 1
      ? `Nível ${fromLevel} → ${level} · +${levelDelta} níveis`
      : xp > 0
        ? `+${xp} XP${xpToNext > 0 ? ` · faltam ${xpToNext} XP para o Nível ${level + 1}` : ""}`
        : xpToNext > 0
          ? `Faltam ${xpToNext} XP para o Nível ${level + 1}`
          : "";

  // UMA segunda linha, no máximo. Prioridade: desbloqueio > aviso de teto > dica.
  const secondaryLine = crossedTier
    ? `Nova aparência desbloqueada${tierLabel ? ` · ${tierLabel}` : ""}`
    : wasCapped || reachedDailyLimit
      ? "Limite diário atingido — parte do XP não foi creditada."
      : nextTierLevel
        ? `Próxima aparência no Nível ${nextTierLevel}`
        : "";
  const secondaryTone = crossedTier
    ? "text-brand-light"
    : wasCapped || reachedDailyLimit
      ? "text-amber-300/90"
      : "text-muted";

  return (
    <ModalPortal>
      <AnimatePresence onExitComplete={() => setInDom(false)}>
        {open && (
          <motion.div
            ref={rootRef}
            data-levelup=""
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="levelup-title"
            aria-describedby="levelup-desc"
            onKeyDown={onRootKeyDown}
            /* z-[80]: acima do StoryViewer (70), do popover (60) e dos modais (50).
               `h-[100dvh]` e não `inset-0`: no iOS o `fixed` ancora no layout
               viewport e o "Confirmar" nasceria por baixo da barra do Safari.
               bg-ink/55 e NÃO /80: o pedido é "blur em todo o fundo"; a 0,80 só
               20% do backdrop desfocado atravessa e o efeito vira preto chapado.
               ESTE nó não rola — o scroller é o filho, senão a vinheta `inset-0`
               se dimensionaria pela caixa de scroll e deixaria de cobrir a tela. */
            className="fixed inset-x-0 top-0 z-[80] h-[100dvh] bg-ink/55 outline-none backdrop-blur-lg sm:bg-ink/60 sm:backdrop-blur-2xl"
            variants={rootVariants}
            custom={T.exit}
            initial="hidden"
            animate="shown"
            exit="gone"
            transition={{ duration: T.backdrop.dur, ease: EASE_HOUSE }}
          >
            {/* vinheta: teto em 0,35 para não anular o desfoque nos cantos */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(64%_64%_at_50%_46%,transparent_0%,rgba(5,5,9,0.35)_100%)]"
            />

            {/* GRID de 3 linhas: [1fr] [palco] [1fr]. As duas linhas `1fr`
                dividem a folga IGUALMENTE, então o palco — e portanto o
                personagem — fica no centro EXATO da viewport (requisito 1).
                Quando falta altura, a linha 3 fica com seu min-content e a
                linha 1 encolhe: a composição sobe suavemente em vez de saltar.
                A rolagem começa no topo, então nada fica inalcançável acima
                (o bug clássico de `justify-center` + `overflow-y-auto`). */}
            <div className="relative grid h-full grid-rows-[1fr_auto_1fr] justify-items-center overflow-y-auto overscroll-contain px-5 py-5">
              <div aria-hidden />

              {/* ------------------------- PALCO ------------------------- */}
              <motion.div
                variants={contentVariants}
                custom={T.exit}
                className="lu-stage relative aspect-square"
              >
                {/* halo largo ESTÁTICO: só `opacity` anima, nunca re-rasteriza */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-[-12%] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.26)_0%,transparent_62%)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: T.arc.at }}
                />

                <Arc progress={progress} reduce={reduce} at={T.arc.at} />

                {/* --------------------- ESTRELAS --------------------- */}
                <div aria-hidden className="absolute inset-0">
                  {LU_STARS.map((s, i) => (
                    <motion.span
                      key={i}
                      className={cn("absolute", s.tier)}
                      style={{
                        left: `${s.left}%`,
                        top: `${s.top}%`,
                        width: `${s.size}%`,
                        x: "-50%",
                        y: "-50%",
                        color: s.tone,
                      }}
                      initial={{ opacity: 0, scale: 0.3 }}
                      animate={
                        reduce || settled
                          ? { opacity: 0.58, scale: 1, rotate: 0 }
                          : { opacity: [0, 1, 0], scale: [0.3, 1, 0.35], rotate: [-18, 0, 18] }
                      }
                      transition={
                        reduce || settled
                          ? // 1,2 s: o framer anima a partir do valor ATUAL,
                            // então nenhuma estrela congela no meio do flash.
                            { duration: 1.2, ease: "easeInOut" }
                          : {
                              duration: s.cycle,
                              repeat: Infinity,
                              repeatDelay: s.pause,
                              ease: "easeInOut",
                              // sobe rápido, apaga devagar: simétrico pisca como LED
                              times: [0, 0.42, 1],
                              delay: T.arc.at + T.arc.dur * s.ignite,
                            }
                      }
                    >
                      {/* faísca de 4 pontas preenchida — a Star da lucide é um
                          pentagrama de contorno, vocabulário de avaliação.
                          ZERO filter e ZERO box-shadow por estrela: o bloom é
                          o radial estático acima. E nada de `will-change`:
                          28 camadas promovidas para sempre sob um
                          backdrop-filter custam mais do que economizam. */}
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-auto w-full">
                        <path d="M12 0Q13.2 10.8 24 12Q13.2 13.2 12 24Q10.8 13.2 0 12Q10.8 10.8 12 0Z" />
                      </svg>
                    </motion.span>
                  ))}
                </div>

                {/* --------------------- PERSONAGEM ---------------------
                    50% do palco. As porcentagens ficam NESTE nó, que é
                    `absolute` contra o palco (largura e altura definidas).
                    Pendurá-las num item de grid `place-items-center` daria
                    fit-content nos dois eixos e o personagem renderizaria
                    0×0: a tela abriria sem o requisito nº 1. */}
                <div className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2">
                  {/* três wrappers: entrada, respiração e pulso NÃO podem
                      compartilhar elemento — as transitions brigariam. */}
                  <motion.div
                    className="absolute inset-0"
                    initial={reduce ? false : { scale: 0.86, y: 14, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={
                      reduce
                        ? { duration: 0.12 }
                        : { type: "spring", stiffness: 210, damping: 17, delay: T.character.at }
                    }
                  >
                    <motion.div
                      className="absolute inset-0"
                      animate={reduce ? undefined : { y: [0, -6, 0] }}
                      transition={
                        reduce
                          ? undefined
                          : { duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 1.4 }
                      }
                    >
                      <motion.div
                        className="absolute inset-0"
                        animate={reduce ? undefined : { scale: [1, 1.035, 1] }}
                        transition={
                          reduce
                            ? undefined
                            : { duration: T.flash.dur, delay: T.flash.at, ease: "easeOut" }
                        }
                      >
                        {/* flash branco no fechamento do anel: o encontro das
                            duas cabeças é a batida principal — algo tem que
                            responder a ela, senão o arco fecha no vazio. */}
                        {!reduce && (
                          <motion.div
                            aria-hidden
                            className="pointer-events-none absolute inset-[-30%] rounded-full bg-[radial-gradient(circle,rgba(248,250,252,0.55)_0%,transparent_60%)]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, swapsArt ? 0.95 : 0.5, 0] }}
                            transition={{ duration: 0.5, delay: T.flash.at, ease: "easeOut" }}
                          />
                        )}

                        {/* arte ANTIGA: só existe quando a imagem muda mesmo */}
                        {swapsArt && prevArtSrc && !artFailed && (
                          <motion.div
                            className="absolute inset-0"
                            initial={{ opacity: 1, scale: 1 }}
                            animate={{ opacity: 0, scale: 1.06 }}
                            transition={{ duration: T.tierSwap.dur, delay: T.tierSwap.at }}
                          >
                            {/* `unoptimized`: sem bloco `images` no next.config,
                                o otimizador serviria /_next/image?url=… — outra
                                entrada de cache, e o pré-decode do portão
                                aqueceria uma URL que esta tag nunca pede.
                                A arte já é webp 800×800 estática. */}
                            <Image
                              src={prevArtSrc}
                              alt=""
                              width={800}
                              height={800}
                              priority
                              unoptimized
                              className="h-full w-full object-contain"
                            />
                          </motion.div>
                        )}

                        {showArt ? (
                          <motion.div
                            className="absolute inset-0"
                            initial={swapsArt ? { opacity: 0, scale: 0.94 } : false}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={
                              swapsArt
                                ? { duration: T.tierSwap.dur, delay: T.tierSwap.at }
                                : { duration: 0 }
                            }
                          >
                            <Image
                              src={artSrc}
                              alt=""
                              width={800}
                              height={800}
                              priority
                              unoptimized
                              onError={() => setArtFailed(true)}
                              className="h-full w-full object-contain drop-shadow-[0_0_34px_rgba(139,92,246,0.5)]"
                            />
                          </motion.div>
                        ) : (
                          /* sem classe ou arte 404: o numeral, como no fallback
                             do CharacterFrame. Nunca um vazio.
                             SVG com viewBox e não `font-size` em %: a % seria
                             relativa ao tipo HERDADO (14 px), renderizando um
                             "12" de 5 px; o viewBox amarra o numeral ao TAMANHO
                             DA CAIXA, que é o que se quer. */
                          <svg
                            aria-hidden
                            viewBox="0 0 100 100"
                            className="absolute inset-0 h-full w-full"
                          >
                            <text
                              x="50"
                              y="50"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize="34"
                              fontWeight="700"
                              className="fill-brand-light/70 font-display"
                            >
                              {level}
                            </text>
                          </svg>
                        )}
                      </motion.div>
                    </motion.div>
                  </motion.div>
                </div>

                {/* --------- CHAPA DE NÍVEL, na base do anel ---------
                    O dado que mais importa fica DENTRO da composição, como
                    uma medalha presa no arco — assim ele ganha peso sem
                    custar uma linha de altura ao chrome, que é o orçamento
                    que decide o tamanho do personagem. */}
                <motion.div
                  className="absolute left-1/2 top-[95%] z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand/45 bg-ink px-4 py-1.5 shadow-glow"
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: T.chip.dur, delay: T.chip.at, ease: EASE_HOUSE }}
                >
                  <span className="font-display text-lg font-bold tabular-nums text-soft sm:text-xl">
                    <span className="mr-1.5 align-middle text-[0.62em] font-semibold uppercase tracking-[0.14em] text-brand-light">
                      Nível
                    </span>
                    {level}
                  </span>
                </motion.div>
              </motion.div>

              {/* -------------------- TEXTO + AÇÃO -------------------- */}
              <motion.div
                variants={contentVariants}
                custom={T.exit}
                className="mt-4 flex w-full max-w-md flex-col items-center self-start text-center [@media(max-height:520px)]:mt-2"
              >
                <h2
                  id="levelup-title"
                  /* UM único nó de texto. Fatiar em palavras aplicaria
                     `background-clip: text` por palavra e a rampa do gradiente
                     reiniciaria 4 vezes — listrado, o oposto de premium. E não
                     adianta subir o gradiente para o <h2>: descendente com
                     `transform` se desprende do background-clip do ancestral no
                     Chrome/Safari. A revelação é um wipe da esquerda para a
                     direita, o mesmo vocabulário do arco. */
                  className={cn(
                    "lu-title font-display text-[22px] font-bold leading-tight tracking-tight sm:text-[28px] md:text-[32px] [@media(max-height:520px)]:text-xl",
                    !reduce && "lu-sheen",
                  )}
                >
                  <motion.span
                    className="inline-block"
                    initial={reduce ? false : { clipPath: "inset(0% 100% 0% 0%)", opacity: 0 }}
                    animate={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
                    transition={{ duration: T.title.dur, delay: T.title.at, ease: EASE_HOUSE }}
                  >
                    {heading}
                  </motion.span>
                </h2>

                <motion.div
                  id="levelup-desc"
                  className="mt-1.5 flex flex-col items-center gap-0.5"
                  initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: T.lines.dur, delay: T.lines.at, ease: EASE_HOUSE }}
                >
                  {primaryLine && (
                    <p className="text-xs font-medium tabular-nums text-soft/85 sm:text-sm">
                      {primaryLine}
                    </p>
                  )}
                  {secondaryLine && <p className={cn("text-xs", secondaryTone)}>{secondaryLine}</p>}
                </motion.div>

                {/* Montado desde t=0 (o foco e o Esc já funcionam), mas só
                    clicável quando fica visível — clicar num botão invisível
                    aos 0,5 s seria um acidente, não uma escolha. */}
                <motion.div
                  ref={actionRef}
                  className={cn(
                    "mt-4 w-full [@media(max-height:520px)]:mt-2",
                    !ready && "pointer-events-none",
                  )}
                  initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: T.button.dur, delay: T.button.at, ease: EASE_HOUSE }}
                >
                  <Button
                    variant="primary"
                    size="md"
                    onClick={onConfirm}
                    className="mx-auto w-full max-w-[220px] sm:w-auto"
                  >
                    Confirmar
                  </Button>
                </motion.div>

                {preview && (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted/70">
                    Simulação · nada foi gravado
                  </p>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}

/**
 * Arco de glow na cor da barra de XP (bg-brand-gradient: #8B5CF6 → #A855F7 →
 * #C084FC, os três hex exatos de tailwind.config.ts).
 *
 * DUAS metades partindo do MESMO ponto às 9h (uma por cima, outra por baixo) e
 * chegando juntas às 3h. Com `strokeLinecap="round"` as pontas se fundem num
 * ponto na largada e se reencontram num ponto na chegada: durante 840 ms é um
 * arco abrindo como um abraço da esquerda para a direita — o pedido literal —
 * e no fim é um anel fechado, sem costura.
 *
 * ZERO `filter`: `pathLength` é implementado pelo framer como
 * `stroke-dasharray`/`dashoffset` por frame, ou seja, repaint. Um `filter` no
 * grupo faria o conjunto inteiro re-rasterizar 60×/s ENQUANTO o `backdrop-filter`
 * de tela cheia ainda anima. O bloom vem de um traço companheiro largo e
 * translúcido — sem filtro — mais o radial estático do palco.
 */
function Arc({
  progress,
  reduce,
  at,
}: {
  progress: MotionValue<number>;
  reduce: boolean;
  at: number;
}) {
  const uid = useId().replace(/:/g, ""); // id de SVG é global no documento
  // cabeça-cometa: um dash curto de 4% que persegue a ponta da varredura.
  // `pathOffset` em vez de `offsetPath` — é dash puro, funciona em todo engine,
  // e offsetPath em filho de SVG é irregular no Safari.
  const headOffset = useTransform(progress, (v) => Math.max(0, v - 0.04));
  const headOpacity = useTransform(progress, [0, 0.05, 0.9, 1], [0, 1, 1, 0]);

  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden
      className="absolute inset-0 h-full w-full overflow-visible"
    >
      <defs>
        {/* eixo do gradiente alinhado à direção da varredura: como as duas
            metades vão da esquerda para a direita, `x` é monotônico ao longo do
            caminho inteiro, então os três roxos saem em ordem na cabeça do arco
            e as metades espelhadas ficam iguais em cor a cada `x`. */}
        <linearGradient
          id={`${uid}-arc`}
          gradientUnits="userSpaceOnUse"
          x1="20"
          y1="200"
          x2="380"
          y2="200"
        >
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>
      </defs>

      <motion.g
        fill="none"
        stroke={`url(#${uid}-arc)`}
        strokeLinecap="round"
        /* O fade TERMINA quando a varredura começa. Se começasse junto, os dois
           pontos que o cap redondo desenha às 9h em pathLength=0 ficariam
           visíveis durante o fade inteiro. */
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, delay: reduce ? 0 : Math.max(0, at - 0.15) }}
      >
        {/* bloom: traço largo translúcido, MESMO pathLength, SEM filter */}
        <motion.path d={RING.top} strokeWidth={18} opacity={0.2} style={{ pathLength: progress }} />
        <motion.path d={RING.bot} strokeWidth={18} opacity={0.2} style={{ pathLength: progress }} />
        {/* traço nítido */}
        <motion.path d={RING.top} strokeWidth={6} style={{ pathLength: progress }} />
        <motion.path d={RING.bot} strokeWidth={6} style={{ pathLength: progress }} />

        {!reduce &&
          [RING.top, RING.bot].map((d, k) => (
            <motion.path
              key={k}
              d={d}
              stroke="#F8FAFC"
              strokeWidth={7}
              style={{ pathLength: 0.04, pathOffset: headOffset, opacity: headOpacity }}
            />
          ))}
      </motion.g>
    </svg>
  );
}
