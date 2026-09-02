"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeBossHits } from "@/lib/bossEvents";
import { clearAttackIntent, consumeAttackIntent } from "@/lib/attackIntent";
import { bandInsets, centerYFor, guidedScrollTo, isFramed } from "@/lib/guidedScroll";
import { ATTACK, attackBudgetMs } from "@/lib/animations";
import type { Category } from "@/data/types";
import type { BossBattleState } from "@/types/database";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Depois de o usuário rolar durante uma investida, não puxamos a tela de novo. */
const COOLDOWN_MS = 30_000;

/** Folga sobre o orçamento antes de o watchdog assumir que a animação morreu. */
const WATCHDOG_SLACK_MS = 1200;

interface Options {
  /** false → verdade aplicada na hora, zero coreografia e zero rolagem. */
  enabled: boolean;
  rowRef: React.RefObject<HTMLElement | null>;
  applyHit: (next: BossBattleState) => void;
  /** RPC anterior à migração (sem `boss`) → cai no refetch. */
  onLegacyEvent: () => void;
  /** primeira investida do usuário (legenda de estreia). */
  onFirstAttack?: () => void;
}

/**
 * Coreografia de ataque das 3 arenas.
 *
 * NÃO existe preditor de dano: o evento carrega o estado autoritativo pós-golpe.
 * A única coisa que este hook decide é QUANDO esse estado entra na tela — no
 * frame do impacto, e não um RTT antes dele.
 *
 * As arenas correm em PARALELO: cada card tem o próprio relógio. Serializar as
 * três transformaria o momento pedido ("as 3 TBH centralizadas") numa espera de
 * vários segundos. A fila existe só para a ROLAGEM, que é recurso único.
 */
export function useBossAttackChoreography({
  enabled,
  rowRef,
  applyHit,
  onLegacyEvent,
  onFirstAttack,
}: Options) {
  /** attackId corrente por categoria. Ausente = card em repouso. */
  const [attacks, setAttacks] = useState<Partial<Record<Category, number>>>({});

  const pendingRef = useRef(new Map<Category, BossBattleState[]>());
  const activeRef = useRef(new Set<Category>());
  const burstRef = useRef(false);
  const idRef = useRef(0);
  const timersRef = useRef(new Map<Category, number>());
  const cancelScrollRef = useRef<() => void>(() => {});
  const restoreRef = useRef<{ from: number; landed: number } | null>(null);
  const cooldownRef = useRef(0);
  const firedFirstRef = useRef(false);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const applyRef = useRef(applyHit);
  applyRef.current = applyHit;
  const legacyRef = useRef(onLegacyEvent);
  legacyRef.current = onLegacyEvent;
  const firstRef = useRef(onFirstAttack);
  firstRef.current = onFirstAttack;
  const launchRef = useRef<() => void>(() => {});
  const settleRef = useRef<(c: Category) => void>(() => {});

  /** Aplica agora tudo que estiver represado (aborto, watchdog, desmontagem). */
  const flush = useCallback((only?: Category) => {
    const map = pendingRef.current;
    for (const c of only ? [only] : [...map.keys()]) {
      const arr = map.get(c);
      if (arr?.length) applyRef.current(arr[arr.length - 1]);
      map.delete(c);
    }
  }, []);

  const clearTimer = useCallback((c: Category) => {
    const t = timersRef.current.get(c);
    if (t !== undefined) {
      window.clearTimeout(t);
      timersRef.current.delete(c);
    }
  }, []);

  const abort = useCallback(() => {
    cancelScrollRef.current();
    cancelScrollRef.current = () => {};
    for (const t of timersRef.current.values()) window.clearTimeout(t);
    timersRef.current.clear();
    activeRef.current.clear();
    burstRef.current = false;
    restoreRef.current = null;
    flush();
    setAttacks({});
  }, [flush]);

  /** Contato: aplica o próximo estado e diz se ainda há golpe na fila. */
  const onHit = useCallback(
    (c: Category): boolean => {
      const arr = pendingRef.current.get(c);
      if (!arr?.length) return false;
      applyRef.current(arr.shift()!);
      clearTimer(c);
      const remaining = arr.length;
      timersRef.current.set(
        c,
        window.setTimeout(
          () => settleRef.current(c),
          attackBudgetMs(remaining + 1) + WATCHDOG_SLACK_MS,
        ),
      );
      return remaining > 0;
    },
    [clearTimer],
  );

  /** Fim (ou watchdog) de uma investida. */
  const onSettled = useCallback(
    (c: Category) => {
      clearTimer(c);
      activeRef.current.delete(c);

      // chegou golpe novo durante o retorno → nova investida, novo attackId
      const pendentes = pendingRef.current.get(c)?.length ?? 0;
      if (pendentes > 0 && enabledRef.current) {
        activeRef.current.add(c);
        const id = ++idRef.current;
        setAttacks((a) => ({ ...a, [c]: id }));
        timersRef.current.set(
          c,
          window.setTimeout(
            () => settleRef.current(c),
            attackBudgetMs(pendentes) + WATCHDOG_SLACK_MS,
          ),
        );
        return;
      }

      flush(c); // watchdog: nunca deixa HP represado
      setAttacks((a) => {
        const next = { ...a };
        delete next[c];
        return next;
      });

      if (activeRef.current.size === 0) {
        burstRef.current = false;
        // Devolve a rolagem emprestada — só se o usuário não mexeu. Sem isso,
        // cada conclusão empurra o próximo alvo de clique para fora da tela.
        const r = restoreRef.current;
        restoreRef.current = null;
        if (r && Math.abs(window.scrollY - r.landed) < 8) {
          const s = guidedScrollTo(r.from);
          cancelScrollRef.current = s.cancel;
          void s.done.then(() => {
            cancelScrollRef.current = () => {};
          });
        } else if (r) {
          // ele disse "não" com o dedo: paramos de puxar por um tempo
          cooldownRef.current = Date.now() + COOLDOWN_MS;
        }
      }
    },
    [clearTimer, flush],
  );
  settleRef.current = onSettled;

  /** Solta todas as categorias com dano represado e sem investida em curso. */
  const launch = useCallback(() => {
    const next: Partial<Record<Category, number>> = {};
    for (const [c, arr] of pendingRef.current) {
      if (!arr.length || activeRef.current.has(c)) continue;
      activeRef.current.add(c);
      next[c] = ++idRef.current;
      timersRef.current.set(
        c,
        window.setTimeout(
          () => settleRef.current(c),
          attackBudgetMs(arr.length) + WATCHDOG_SLACK_MS,
        ),
      );
    }
    if (Object.keys(next).length === 0) return;
    if (!firedFirstRef.current) {
      firedFirstRef.current = true;
      firstRef.current?.();
    }
    setAttacks((a) => ({ ...a, ...next }));
  }, []);
  launchRef.current = launch;

  /** Início da rajada: rola PRIMEIRO, caminha DEPOIS. */
  const startBurst = useCallback(
    async (first: Category) => {
      if (burstRef.current) {
        launchRef.current();
        return;
      }
      burstRef.current = true;

      const row = rowRef.current;
      const intent = consumeAttackIntent(Date.now());
      if (row && intent) {
        const { band } = bandInsets();
        // A fileira empilhada mede ~712px no mobile: não cabe em aparelho
        // nenhum. Cabe → a fileira inteira (pedido literal). Não cabe → o card
        // que está lutando.
        const target =
          row.getBoundingClientRect().height <= band - 24
            ? row
            : row.querySelector<HTMLElement>(`[data-boss-arena="${first}"]`);
        const permitido =
          !!target &&
          Date.now() > cooldownRef.current &&
          !document.querySelector('[role="dialog"]') &&
          // o usuário clicou ACIMA das arenas: puxar para baixo faz sentido
          intent.y < row.getBoundingClientRect().top &&
          // enquadramento, não distância: evita tranco de 30px
          !isFramed(target);
        if (permitido && target) {
          const from = window.scrollY;
          const s = guidedScrollTo(centerYFor(target));
          cancelScrollRef.current = s.cancel;
          await Promise.race([s.done, wait(ATTACK.scrollMaxWaitMs)]);
          cancelScrollRef.current = () => {};
          restoreRef.current = { from, landed: Math.round(window.scrollY) };
        }
      }
      launchRef.current();
    },
    [rowRef],
  );

  // Único ouvinte do pub/sub em todo o app.
  useEffect(
    () =>
      subscribeBossHits((e) => {
        if (!e.boss) {
          legacyRef.current(); // RPC antiga: cai no refetch
          return;
        }
        if (e.damage <= 0 || !enabledRef.current || document.hidden) {
          applyRef.current(e.boss); // verdade imediata, sem coreografia
          return;
        }
        const map = pendingRef.current;
        const arr = map.get(e.category);
        if (arr) arr.push(e.boss);
        else map.set(e.category, [e.boss]);
        void startBurst(e.category);
      }),
    [startBurst],
  );

  // Qualquer rolagem do usuário mata a intenção ainda não consumida: entre o
  // clique e a resposta da RPC passam 200–800ms, e nesse tempo ele pode ter
  // continuado lendo a lista.
  useEffect(() => {
    const onScroll = () => {
      if (!burstRef.current) clearAttackIntent();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Aba escondida: o rAF congela e o herói ficaria parado no meio do palco.
  // Só no sentido "saindo" — voltar à aba não pode abortar sequência legítima.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) abort();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [abort]);

  // Desligar a preferência no meio da animação: encerra e mostra a verdade.
  useEffect(() => {
    if (!enabled) abort();
  }, [enabled, abort]);

  // Troca de rota: sem isto o tween de scroll continuaria na próxima página.
  useEffect(() => abort, [abort]);

  return { attacks, onHit, onSettled, abort };
}
