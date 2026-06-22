"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FocusPhase = "idle" | "running" | "paused" | "done";

interface UseFocusTimerOptions {
  /** chamado UMA vez quando o tempo chega a zero naturalmente. */
  onComplete?: () => void;
}

/**
 * Cronômetro regressivo do Modo Foco.
 *
 * Usa um instante-alvo absoluto (endAt) em vez de decrementar um contador, para
 * não acumular desvio (drift) ao longo de sessões longas. O tick (4x/seg) só
 * recalcula o restante; pausar congela o restante e retomar recria o alvo.
 */
export function useFocusTimer({ onComplete }: UseFocusTimerOptions = {}) {
  const [phase, setPhase] = useState<FocusPhase>("idle");
  /** duração total da sessão atual, em segundos. */
  const [totalSeconds, setTotalSeconds] = useState(0);
  /** segundos restantes (atualizado pelo tick). */
  const [remaining, setRemaining] = useState(0);

  // instante-alvo (ms epoch) enquanto rodando; null quando pausado/parado
  const endAtRef = useRef<number | null>(null);
  // restante congelado ao pausar (segundos)
  const frozenRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /** Avalia o restante a partir do alvo e dispara a conclusão ao zerar. */
  const tick = useCallback(() => {
    if (endAtRef.current === null) return;
    const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
    setRemaining(left);
    if (left <= 0) {
      clearTick();
      endAtRef.current = null;
      frozenRef.current = 0;
      setPhase("done");
      onCompleteRef.current?.();
    }
  }, [clearTick]);

  const startTick = useCallback(() => {
    clearTick();
    intervalRef.current = setInterval(tick, 250);
  }, [clearTick, tick]);

  /** Inicia uma nova sessão com a duração informada (em minutos). */
  const start = useCallback(
    (minutes: number) => {
      const secs = Math.max(1, Math.round(minutes * 60));
      setTotalSeconds(secs);
      setRemaining(secs);
      frozenRef.current = secs;
      endAtRef.current = Date.now() + secs * 1000;
      setPhase("running");
      startTick();
    },
    [startTick],
  );

  /** Pausa: congela o restante e para o tick. */
  const pause = useCallback(() => {
    if (phase !== "running" || endAtRef.current === null) return;
    const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
    frozenRef.current = left;
    setRemaining(left);
    endAtRef.current = null;
    clearTick();
    setPhase("paused");
  }, [phase, clearTick]);

  /** Retoma a partir do restante congelado. */
  const resume = useCallback(() => {
    if (phase !== "paused") return;
    endAtRef.current = Date.now() + frozenRef.current * 1000;
    setPhase("running");
    startTick();
  }, [phase, startTick]);

  /** Para e zera tudo (sem concluir). */
  const reset = useCallback(() => {
    clearTick();
    endAtRef.current = null;
    frozenRef.current = 0;
    setPhase("idle");
    setTotalSeconds(0);
    setRemaining(0);
  }, [clearTick]);

  /** Volta ao estado inicial após uma conclusão (mantém pronto para nova sessão). */
  const acknowledgeDone = useCallback(() => {
    setPhase("idle");
    setTotalSeconds(0);
    setRemaining(0);
  }, []);

  // limpa o intervalo ao desmontar
  useEffect(() => clearTick, [clearTick]);

  const elapsed = totalSeconds - remaining;
  const progress = totalSeconds > 0 ? Math.min(1, Math.max(0, elapsed / totalSeconds)) : 0;

  return {
    phase,
    totalSeconds,
    remaining,
    /** fração concluída [0..1], para o anel de progresso. */
    progress,
    isActive: phase === "running" || phase === "paused",
    start,
    pause,
    resume,
    reset,
    acknowledgeDone,
  };
}
