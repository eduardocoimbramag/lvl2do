"use client";

import { XpToast } from "./XpToast";
import { useAppStats } from "@/hooks/AppStateProvider";

/**
 * Toast de XP ligado ao estado global — exibe o feedback de ganho/perda de XP
 * em qualquer página interna (montado no layout do app).
 *
 * Recebe `toastFeedback`, e não `feedback`: subida de nível é filtrada no
 * provider e roteada para o LevelUpOverlay, que engole o evento.
 */
export function GlobalXpToast() {
  const { toastFeedback, dismissFeedback } = useAppStats();
  return <XpToast feedback={toastFeedback} onDismiss={dismissFeedback} />;
}
