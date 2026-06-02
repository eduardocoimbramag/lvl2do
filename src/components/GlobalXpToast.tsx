"use client";

import { XpToast } from "./XpToast";
import { useAppStats } from "@/hooks/AppStateProvider";

/**
 * Toast de XP ligado ao estado global — exibe o feedback de ganho/perda de XP
 * em qualquer página interna (montado no layout do app).
 */
export function GlobalXpToast() {
  const { feedback, dismissFeedback } = useAppStats();
  return <XpToast feedback={feedback} onDismiss={dismissFeedback} />;
}
