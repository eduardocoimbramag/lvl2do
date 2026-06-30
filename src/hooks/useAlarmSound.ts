"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Toque de sino sintetizado via Web Audio (sem depender de arquivos de áudio).
 *
 * Um único som — "Sino" — usado tanto na pré-escuta quanto no disparo de
 * alarmes e na conclusão do Modo Foco. Como é gerado em código, sempre funciona
 * em qualquer máquina (não exibe "arquivo indisponível").
 */
export function useAlarmSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  /** Garante (e retoma) um AudioContext — criado sob gesto do usuário. */
  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctxRef.current) ctxRef.current = new AC();
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  /**
   * Toca o sino. `repeats` toca o "ding" algumas vezes em sequência (usado no
   * disparo do alarme, para chamar mais atenção que a pré-escuta).
   */
  const playBell = useCallback(
    (repeats = 1) => {
      const ctx = getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      // duas parciais harmônicas dão o timbre metálico do sino
      const partials = [
        { freq: 880, gain: 0.5 }, // fundamental (A5)
        { freq: 1760, gain: 0.25 }, // oitava acima
        { freq: 2640, gain: 0.12 }, // harmônico
      ];

      for (let r = 0; r < repeats; r++) {
        const t0 = now + r * 0.6; // espaça os toques repetidos
        const master = ctx.createGain();
        master.connect(ctx.destination);
        // envelope: ataque rápido + decaimento exponencial (~1.1s)
        master.gain.setValueAtTime(0.0001, t0);
        master.gain.exponentialRampToValueAtTime(0.9, t0 + 0.01);
        master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);

        for (const p of partials) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(p.freq, t0);
          g.gain.setValueAtTime(p.gain, t0);
          osc.connect(g);
          g.connect(master);
          osc.start(t0);
          osc.stop(t0 + 1.2);
        }
      }
    },
    [getCtx],
  );

  /** Pré-escuta (um toque). */
  const preview = useCallback(() => playBell(1), [playBell]);

  /** Disparo do alarme/foco (alguns toques em sequência). */
  const fire = useCallback(() => playBell(3), [playBell]);

  /** Mantido por compatibilidade — o sino é curto e não precisa ser parado. */
  const stop = useCallback(() => {}, []);

  // fecha o contexto ao desmontar
  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  return {
    /** pré-escuta o sino (um toque). */
    preview,
    /** dispara o sino (uso do scheduler/foco). */
    fire,
    /** no-op (compatibilidade). */
    stop,
  };
}
