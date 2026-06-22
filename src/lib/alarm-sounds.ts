/**
 * Catálogo de sons (toques) dos alarmes.
 *
 * Os arquivos de áudio ficam em /public/sounds/<file>. Coloque os .mp3 com
 * EXATAMENTE estes nomes (como foi feito com as artes dos personagens). Até os
 * arquivos existirem, o preview avisa que o som não está disponível.
 */

import { Waves, Bell, Radio, Music2, Zap, AlarmClock, type LucideIcon } from "lucide-react";

export interface AlarmSound {
  /** identificador estável salvo no alarme. */
  id: string;
  /** nome exibido na UI. */
  label: string;
  /** caminho do arquivo em /public/sounds. */
  src: string;
  /** ícone ilustrativo do card de som. */
  icon: LucideIcon;
  /** descrição curta do timbre. */
  hint: string;
}

/**
 * Lista oficial de sons. ARQUIVOS NECESSÁRIOS em /public/sounds/:
 *   suave.mp3 · sino.mp3 · digital.mp3 · classico.mp3 · energia.mp3 · toque.mp3
 */
export const ALARM_SOUNDS: AlarmSound[] = [
  { id: "suave", label: "Suave", src: "/sounds/suave.mp3", icon: Waves, hint: "Despertar calmo e gradual" },
  { id: "sino", label: "Sino", src: "/sounds/sino.mp3", icon: Bell, hint: "Sino claro e limpo" },
  { id: "digital", label: "Digital", src: "/sounds/digital.mp3", icon: Radio, hint: "Bip eletrônico moderno" },
  { id: "classico", label: "Clássico", src: "/sounds/classico.mp3", icon: AlarmClock, hint: "Despertador tradicional" },
  { id: "energia", label: "Energia", src: "/sounds/energia.mp3", icon: Zap, hint: "Intenso para acordar" },
  { id: "melodia", label: "Melodia", src: "/sounds/toque.mp3", icon: Music2, hint: "Toque melódico agradável" },
];

/** Primeiro som do catálogo — usado como padrão em novos alarmes. */
export const DEFAULT_SOUND_ID = ALARM_SOUNDS[0].id;

/** Busca um som pelo id (ou o padrão, se não encontrado). */
export function getSound(id: string): AlarmSound {
  return ALARM_SOUNDS.find((s) => s.id === id) ?? ALARM_SOUNDS[0];
}

/** Rótulo do som (com fallback para o padrão). */
export function getSoundLabel(id: string): string {
  return getSound(id).label;
}
