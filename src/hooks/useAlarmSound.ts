"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSound } from "@/lib/alarm-sounds";

/**
 * Player de som dos alarmes (preview + disparo). Reutiliza um único elemento
 * <audio> para o preview, parando o som anterior ao tocar outro. Trata o caso
 * de o arquivo .mp3 ainda não existir em /public/sounds (sinaliza erro para a
 * UI avisar, sem quebrar).
 */
export function useAlarmSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // id do som tocando agora no preview (para destacar na UI) ou null
  const [playingId, setPlayingId] = useState<string | null>(null);
  // ids de sons cujo arquivo falhou ao carregar (avisar "indisponível")
  const [missing, setMissing] = useState<Set<string>>(new Set());

  // cria o elemento de áudio uma vez (no cliente)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = new Audio();
    el.preload = "none";
    audioRef.current = el;
    const onEnded = () => setPlayingId(null);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("ended", onEnded);
      el.pause();
      audioRef.current = null;
    };
  }, []);

  /** Para qualquer preview em andamento. */
  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setPlayingId(null);
  }, []);

  /**
   * Toca (preview) o som de id informado. Se já estiver tocando esse mesmo som,
   * funciona como toggle (para). Marca como "missing" se o arquivo não carregar.
   */
  const preview = useCallback(
    (soundId: string) => {
      const el = audioRef.current;
      if (!el) return;
      // toggle: clicar de novo no que toca → para
      if (playingId === soundId) {
        stop();
        return;
      }
      const sound = getSound(soundId);
      el.pause();
      el.currentTime = 0;
      el.src = sound.src;
      setPlayingId(soundId);
      el.play().catch(() => {
        // arquivo ausente / bloqueio de autoplay → sinaliza e limpa
        setMissing((prev) => new Set(prev).add(soundId));
        setPlayingId((cur) => (cur === soundId ? null : cur));
      });
    },
    [playingId, stop],
  );

  /**
   * Dispara o som do alarme (sem toggle, sem destacar UI). Usado pelo
   * scheduler quando o alarme toca. Cria um elemento próprio para não
   * conflitar com o preview e permitir toques sobrepostos.
   */
  const fire = useCallback((soundId: string) => {
    if (typeof window === "undefined") return;
    const sound = getSound(soundId);
    const el = new Audio(sound.src);
    el.play().catch(() => {
      setMissing((prev) => new Set(prev).add(soundId));
    });
  }, []);

  return {
    /** id tocando no preview (ou null). */
    playingId,
    /** sons cujo arquivo não pôde ser carregado. */
    missing,
    /** inicia/para o preview de um som (toggle). */
    preview,
    /** para o preview atual. */
    stop,
    /** dispara o som (uso do scheduler). */
    fire,
  };
}
