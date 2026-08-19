"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { X, Pause, Play, Target, Eye, Trash2 } from "lucide-react";
import { CharacterAvatar } from "./CharacterAvatar";
import { ModalPortal } from "./ModalPortal";
import { STORY_DURATION_MS, initialStoryIndex, storyAltText, timeAgo } from "@/data/stories";
import type { Story, StoryRing } from "@/data/stories";
import { useStoryTimer } from "@/hooks/useStoryTimer";
import { deleteStory, signStories } from "@/lib/db/stories";
import { cn } from "@/lib/utils";

/** Tempo de pressão que separa um "tap" (navega) de um "hold" (pausa). */
const HOLD_THRESHOLD_MS = 200;

interface StoryViewerProps {
  /** montado sempre: é o que permite a animação de saída do AnimatePresence. */
  open: boolean;
  rings: StoryRing[];
  /** índice do autor por onde abrir. */
  startRingIndex: number;
  onClose: () => void;
  /** ids vistos nesta sessão: o trilho atualiza o anel e persiste. */
  onSeen: (storyIds: string[]) => void;
  /** um story meu foi apagado — o trilho precisa recarregar. */
  onDeleted?: () => void;
}

/**
 * Visualizador de stories em tela cheia.
 *
 * Mecânica espelhada do Instagram: barras segmentadas por autor, tap à direita
 * avança e à esquerda volta, pressionar e segurar pausa e esconde a interface,
 * arrastar para baixo fecha e para os lados troca de autor. Teclado e
 * `prefers-reduced-motion` são cidadãos de primeira classe.
 */
export function StoryViewer({
  open,
  rings,
  startRingIndex,
  onClose,
  onSeen,
  onDeleted,
}: StoryViewerProps) {
  const reduce = useReducedMotion();

  /** fila congelada na abertura: reordenar no meio da sessão faria a fita saltar. */
  const [frozen, setFrozen] = useState<StoryRing[]>([]);
  const [ringIndex, setRingIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  // Com reduced motion o story abre pausado: avanço automático é movimento
  // não solicitado, e a pessoa navega no próprio ritmo.
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [ready, setReady] = useState(false);
  const [dir, setDir] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const seenRef = useRef<Set<string>>(new Set());
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);
  const draggedRef = useRef(false);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pauseBtnRef = useRef<HTMLButtonElement | null>(null);
  const resignedRef = useRef<string | null>(null);
  const poppedRef = useRef(false);

  const ring: StoryRing | undefined = frozen[ringIndex];
  const story: Story | undefined = ring?.stories[storyIndex];
  const total = ring?.stories.length ?? 0;
  const epoch = `${ringIndex}:${storyIndex}`;

  /* ------------------------- abertura e assinatura ----------------------- */

  // Congela a fila e posiciona. `rings` fora das deps de propósito: é snapshot.
  useEffect(() => {
    if (!open) return;
    setFrozen(rings);
    setRingIndex(startRingIndex);
    setStoryIndex(initialStoryIndex(rings[startRingIndex]?.stories ?? []));
    setPaused(reduce === true);
    setConfirmDelete(false);
    seenRef.current = new Set();
    resignedRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startRingIndex]);

  /** Assina as imagens de um autor (idempotente: só se ainda não tiver URL). */
  const signRing = useCallback((index: number) => {
    setFrozen((prev) => {
      const target = prev[index];
      if (!target || target.stories.length === 0) return prev;
      if (target.stories.every((s) => s.imageUrl)) return prev;
      void signStories(target.stories)
        .then((signed) =>
          setFrozen((cur) =>
            cur.map((r, i) => (i === index ? { ...r, stories: signed } : r)),
          ),
        )
        .catch((e) => console.error("Erro ao assinar stories:", e));
      return prev;
    });
  }, []);

  // Assina o autor atual e adianta o próximo, para a troca não piscar.
  useEffect(() => {
    if (!open) return;
    signRing(ringIndex);
    if (ringIndex + 1 < frozen.length) signRing(ringIndex + 1);
  }, [open, ringIndex, frozen.length, signRing]);

  /* ----------------------------- navegação ------------------------------ */

  /**
   * Entrega os vistos e limpa. Idempotente: pode ser chamado por fechamento,
   * troca de aba, navegação ou desmontagem sem enviar duas vezes.
   */
  const flushSeen = useCallback(() => {
    const ids = [...seenRef.current];
    if (ids.length === 0) return;
    seenRef.current.clear();
    onSeen(ids);
  }, [onSeen]);

  const finish = useCallback(() => {
    flushSeen();
    onClose();
  }, [flushSeen, onClose]);

  const goToRing = useCallback(
    (index: number, direction: number) => {
      const target = frozen[index];
      if (!target) {
        finish();
        return;
      }
      setDir(direction);
      setRingIndex(index);
      setStoryIndex(
        direction < 0 ? Math.max(0, target.stories.length - 1) : initialStoryIndex(target.stories),
      );
    },
    [frozen, finish],
  );

  const next = useCallback(() => {
    setDir(1);
    if (storyIndex + 1 < total) {
      setStoryIndex((i) => i + 1);
      return;
    }
    // Acabaram os stories deste autor: emenda no próximo.
    if (ringIndex + 1 < frozen.length) goToRing(ringIndex + 1, 1);
    else finish();
  }, [storyIndex, total, ringIndex, frozen.length, goToRing, finish]);

  const prev = useCallback(() => {
    setDir(-1);
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      return;
    }
    // No primeiro story, voltar leva ao ÚLTIMO story do autor anterior —
    // é o que mantém a ilusão de uma fita contínua.
    if (ringIndex > 0) goToRing(ringIndex - 1, -1);
  }, [storyIndex, ringIndex, goToRing]);

  /* ------------------------------- timer -------------------------------- */

  const handleProgress = useCallback((p: number) => {
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
  }, []);

  useStoryTimer({
    durationMs: STORY_DURATION_MS,
    epoch,
    enabled: open && ready && !!story?.imageUrl,
    paused: paused || holding || deleting || confirmDelete,
    onProgress: handleProgress,
    onComplete: next,
  });

  // Novo frame: esconde o anterior até a nova imagem decodificar.
  useEffect(() => {
    setReady(false);
  }, [epoch]);

  // Marca como visto assim que o frame monta (mesma regra do Instagram).
  useEffect(() => {
    if (open && story) seenRef.current.add(story.id);
  }, [open, story]);

  // Pré-carrega o próximo frame para a troca não piscar.
  useEffect(() => {
    const upcoming =
      ring?.stories[storyIndex + 1]?.imageUrl ?? frozen[ringIndex + 1]?.stories[0]?.imageUrl;
    if (!upcoming) return;
    const img = new Image();
    img.src = upcoming;
  }, [ring, storyIndex, frozen, ringIndex]);

  /* --------------------- foco, teclado, aba, scroll ---------------------- */

  // Entrega os vistos em qualquer saída: fechar a aba, voltar no navegador,
  // navegar pelo menu. Sem isto, um refresh perde as visualizações da sessão.
  useEffect(() => {
    if (!open) return;
    function onHide() {
      if (document.visibilityState === "hidden") {
        setPaused(true);
        flushSeen();
      }
    }
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushSeen);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushSeen);
      flushSeen();
    };
  }, [open, flushSeen]);

  // Trava a rolagem do fundo e compensa a barra, para a página não "pular".
  useEffect(() => {
    if (!open) return;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [open]);

  // `aria-modal` não basta com portal no body: o resto do app continua
  // alcançável por Tab e por leitor de tela. `inert` é o que realmente isola.
  useEffect(() => {
    if (!open) return;
    const root = document.body.firstElementChild as HTMLElement | null;
    root?.setAttribute("inert", "");
    return () => root?.removeAttribute("inert");
  }, [open]);

  // O viewer é uma tela cheia: no Android o botão voltar tem que fechá-lo, não
  // sair da página. Empilha um estado próprio e desfaz ao sair.
  useEffect(() => {
    if (!open) return;
    history.pushState({ storyViewer: true }, "");
    const onPop = () => {
      poppedRef.current = true;
      finish();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Se o fechamento veio de dentro (X, Esc, swipe), consome a entrada.
      if (!poppedRef.current && history.state?.storyViewer) history.back();
      poppedRef.current = false;
    };
  }, [open, finish]);

  // Devolve o foco a quem abriu o viewer.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    pauseBtnRef.current?.focus();
    return () => opener?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        finish();
      } else if (e.key === "ArrowRight") {
        next();
      } else if (e.key === "ArrowLeft") {
        prev();
      } else if (e.key === " " || e.key === "Spacebar") {
        // Space com foco num botão pertence ao botão, não ao atalho global.
        const t = e.target as HTMLElement | null;
        if (t?.tagName === "BUTTON" && t !== pauseBtnRef.current) return;
        e.preventDefault();
        setPaused((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish, next, prev]);

  /* ------------------------------ gestos -------------------------------- */

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  }, []);

  useEffect(() => clearHold, [clearHold]);

  const onPointerDown = useCallback(() => {
    heldRef.current = false;
    clearHold();
    holdTimerRef.current = setTimeout(() => {
      heldRef.current = true;
      setHolding(true);
    }, HOLD_THRESHOLD_MS);
  }, [clearHold]);

  // pointerup/cancel/leave SEMPRE soltam a pausa: dedo saindo da tela não
  // pode deixar o story travado para sempre.
  const endHold = useCallback(() => {
    clearHold();
    setHolding(false);
  }, [clearHold]);

  /**
   * Só navega se foi um toque curto e sem arrasto. O browser dispara `click`
   * mesmo com 200 px entre o pointerdown e o pointerup, então sem esta guarda
   * todo swipe que começa e termina na mesma zona trocaria de autor E de story.
   */
  const tap = useCallback(
    (action: () => void) => () => {
      if (draggedRef.current || heldRef.current) {
        heldRef.current = false;
        return;
      }
      action();
    },
    [],
  );

  const onDragStart = useCallback(() => {
    draggedRef.current = true;
    // Arrastar por mais de 200 ms não pode apagar a interface no meio do gesto.
    clearHold();
    setHolding(false);
  }, [clearHold]);

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      // Solta a guarda no próximo tick, depois do `click` sintético do browser.
      setTimeout(() => {
        draggedRef.current = false;
      }, 0);

      const w = stageRef.current?.clientWidth ?? window.innerWidth;
      if (info.offset.y > 120 || info.velocity.y > 500) {
        finish();
        return;
      }
      if (info.offset.x < -0.35 * w || info.velocity.x < -400) {
        if (ringIndex + 1 < frozen.length) goToRing(ringIndex + 1, 1);
        else finish();
        return;
      }
      if (info.offset.x > 0.35 * w || info.velocity.x > 400) {
        if (ringIndex > 0) goToRing(ringIndex - 1, -1);
      }
    },
    [ringIndex, frozen.length, goToRing, finish],
  );

  /* ------------------------------ excluir ------------------------------- */

  async function handleDelete() {
    if (!story || deleting) return;
    setDeleting(true);
    try {
      await deleteStory(story.id, story.imagePath);
      onDeleted?.();

      const restantes = ring ? ring.stories.filter((s) => s.id !== story.id) : [];
      if (restantes.length === 0) {
        finish();
        return;
      }
      // Ainda há stories meus: continua na fita, sem fechar por baixo do usuário.
      setFrozen((cur) =>
        cur.map((r, i) => (i === ringIndex ? { ...r, stories: restantes } : r)),
      );
      setStoryIndex((i) => Math.min(i, restantes.length - 1));
      setConfirmDelete(false);
      setDeleting(false);
    } catch (e) {
      console.error("Erro ao excluir story:", e);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  /** URL assinada venceu com a aba aberta: reassina uma vez, senão pula. */
  async function handleImageError() {
    if (!story) return;
    if (resignedRef.current === story.id) {
      next();
      return;
    }
    resignedRef.current = story.id;
    try {
      const [fresh] = await signStories([story]);
      if (!fresh?.imageUrl) {
        next();
        return;
      }
      setFrozen((cur) =>
        cur.map((r, i) =>
          i === ringIndex
            ? { ...r, stories: r.stories.map((s) => (s.id === fresh.id ? fresh : s)) }
            : r,
        ),
      );
    } catch {
      next();
    }
  }

  const alt = useMemo(
    () => (story && ring ? storyAltText(story, ring.author.name) : "Story"),
    [story, ring],
  );

  const slideX = reduce === true ? 0 : dir * 24;

  return (
    <ModalPortal>
      <AnimatePresence>
        {open && ring && story && (
          <motion.div
            /* z acima do modal (z-50), do popover (z-[60]) e da navegação (z-30):
               o story é imersivo e não pode ter nada por cima.
               `h-[100dvh]` e não `inset-0`: no iOS o `fixed` ancora no layout
               viewport e o rodapé some sob a barra do Safari. */
            className="fixed inset-x-0 top-0 z-[70] flex h-[100dvh] items-center justify-center bg-black sm:bg-black/90 sm:backdrop-blur-xl"
            initial={{ opacity: 0, scale: reduce === true ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduce === true ? 1 : 0.96 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Stories dos amigos"
          >
            <motion.div
              ref={stageRef}
              drag
              dragDirectionLock
              dragElastic={0.15}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onPointerDown={onPointerDown}
              onPointerUp={endHold}
              onPointerCancel={endHold}
              onPointerLeave={endHold}
              className="relative h-full w-full touch-none select-none overflow-hidden sm:aspect-[9/16] sm:h-[92dvh] sm:w-auto sm:rounded-[28px] sm:shadow-glow sm:ring-1 sm:ring-white/10"
            >
              {/* letterbox: a própria foto desfocada preenche as sobras */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                aria-hidden
                alt=""
                draggable={false}
                src={story.imageUrl ?? undefined}
                className="absolute inset-0 h-full w-full scale-125 object-cover opacity-35 blur-3xl"
              />

              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, x: slideX }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce === true ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={story.imageUrl ?? undefined}
                    alt={alt}
                    draggable={false}
                    onLoad={() => setReady(true)}
                    onError={handleImageError}
                    className="relative h-full w-full object-contain"
                  />
                </motion.div>
              </AnimatePresence>

              {/* scrims: garantem contraste do texto sobre qualquer foto */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/75 via-black/30 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

              {/* zonas de toque. 30/70 assimétrico: um toque acidental que VOLTA
                  incomoda mais que um que avança. */}
              <button
                type="button"
                aria-label="Story anterior"
                onClick={tap(prev)}
                className="absolute bottom-28 left-0 top-[72px] z-10 w-[30%]"
              />
              <button
                type="button"
                aria-label="Próximo story"
                onClick={tap(next)}
                className="absolute bottom-28 right-0 top-[72px] z-10 w-[70%]"
              />

              {/* interface: some inteira durante o hold */}
              <motion.div
                animate={{ opacity: holding ? 0 : 1 }}
                transition={{ duration: 0.3 }}
                className={cn("contents", holding && "pointer-events-none")}
              >
                {/* barras segmentadas — uma por story do autor */}
                <div className="absolute inset-x-3 top-3 z-20 flex gap-1 sm:inset-x-4 sm:top-4">
                  {ring.stories.map((s, i) => (
                    <span
                      key={s.id}
                      className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/25"
                    >
                      <span
                        ref={i === storyIndex ? fillRef : undefined}
                        className="block h-full w-full origin-left rounded-full bg-soft"
                        style={{ transform: `scaleX(${i < storyIndex ? 1 : 0})` }}
                      />
                    </span>
                  ))}
                </div>

                <div className="absolute inset-x-3 top-7 z-20 flex items-center gap-3 sm:inset-x-4 sm:top-9">
                  <CharacterAvatar
                    characterClass={ring.author.characterClass}
                    level={ring.author.level}
                    size="sm"
                    shape="circle"
                    showLevel={false}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-soft">
                      {ring.isMe ? "Seu story" : ring.author.name}
                    </p>
                    <p className="text-xs tabular-nums text-white/55">{timeAgo(story.createdAt)}</p>
                  </div>

                  <button
                    ref={pauseBtnRef}
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    aria-label={paused ? "Retomar story" : "Pausar story"}
                    className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                  >
                    {paused ? <Play size={17} /> : <Pause size={17} />}
                  </button>
                  <button
                    type="button"
                    onClick={finish}
                    aria-label="Fechar stories"
                    className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                  >
                    <X size={19} />
                  </button>
                </div>

                {/* missão marcada — o "estou fazendo isso agora" */}
                {story.missionTitle && (
                  <div className="absolute inset-x-4 bottom-10 z-20 sm:bottom-6">
                    <div className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-brand/35 bg-brand/15 px-3.5 py-2 shadow-glow-sm backdrop-blur-md">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-gradient">
                        <Target size={14} strokeWidth={2.5} className="text-white" />
                      </span>
                      <span className="truncate font-display text-[13px] font-semibold text-soft">
                        {story.missionTitle}
                      </span>
                    </div>
                  </div>
                )}

                {/* rodapé do próprio story: audiência e exclusão */}
                {ring.isMe && (
                  <div className="absolute inset-x-4 bottom-10 z-20 flex items-end justify-end gap-2 sm:bottom-6">
                    {story.viewCount !== null && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs tabular-nums text-white/80 backdrop-blur-md">
                        <Eye size={13} /> {story.viewCount}
                      </span>
                    )}
                    {confirmDelete ? (
                      <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 backdrop-blur-md">
                        <span className="text-xs text-white/80">Excluir?</span>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={deleting}
                          className="rounded-full border border-rose-400/40 bg-rose-400/15 px-2.5 py-0.5 text-xs font-medium text-rose-300"
                        >
                          {deleting ? "Excluindo…" : "Sim"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="px-1 text-xs text-white/60"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        aria-label="Excluir story"
                        className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white/80 backdrop-blur-md transition-colors hover:text-rose-300"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
