"use client";

import { useEffect, useRef } from "react";

interface UseStoryTimerOptions {
  durationMs: number;
  /**
   * Identidade do frame atual (ex.: "2:1"). Mudou → o relógio zera.
   * É por aqui, e não por um `reset()` imperativo, para o React StrictMode
   * (que monta, desmonta e remonta em dev) não deixar tempo acumulado para trás.
   */
  epoch: string;
  /** só começa a contar quando a imagem já decodificou. */
  enabled: boolean;
  paused: boolean;
  /** recebe 0→1 a cada frame. Escreva direto no DOM, nunca em estado. */
  onProgress: (progress: number) => void;
  onComplete: () => void;
}

/**
 * Relógio do visualizador de stories, em requestAnimationFrame.
 *
 * POR QUE rAF E NÃO CSS/setInterval
 *
 * `globals.css` zera `animation-duration` E `transition-duration` sob
 * `prefers-reduced-motion`. Uma barra de progresso animada por CSS
 * simplesmente congelaria para essas pessoas — e, como o avanço automático
 * depende do fim da animação, o story travaria para sempre. O rAF é imune a
 * isso. De quebra, pausar/retomar viram operações triviais, e o progresso é
 * escrito direto no DOM, sem um re-render por frame.
 */
export function useStoryTimer({
  durationMs,
  epoch,
  enabled,
  paused,
  onProgress,
  onComplete,
}: UseStoryTimerOptions): void {
  /** milissegundos já decorridos (sobrevive à pausa, zera na troca de frame). */
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);

  // Refs para os callbacks: sem isso, uma função inline no JSX do pai
  // reiniciaria o rAF a cada re-render (e a barra voltaria ao zero).
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  // Troca de story: zera o acumulador antes que o loop volte a rodar.
  useEffect(() => {
    elapsedRef.current = 0;
    doneRef.current = false;
    onProgressRef.current(0);
  }, [epoch]);

  useEffect(() => {
    if (!enabled || paused) return;

    let frame = 0;
    let last: number | null = null;

    function tick(ts: number) {
      if (last === null) last = ts;
      elapsedRef.current += ts - last;
      last = ts;

      const progress = Math.min(1, elapsedRef.current / durationMs);
      onProgressRef.current(progress);

      if (progress >= 1) {
        // Guarda contra disparar o avanço duas vezes no mesmo story.
        if (!doneRef.current) {
          doneRef.current = true;
          onCompleteRef.current();
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled, paused, durationMs, epoch]);
}
