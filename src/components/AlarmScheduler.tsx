"use client";

import { useAppAlarms } from "@/hooks/AppStateProvider";
import { useAlarmScheduler } from "@/hooks/useAlarmScheduler";

/**
 * Componente sem UI que mantém o motor de disparo dos alarmes rodando enquanto
 * o app interno estiver aberto. Montado uma única vez no layout (dentro do
 * AppStateProvider), lê os alarmes compartilhados e dispara som + notificação
 * no horário. Alarmes "once" são desativados após tocarem.
 */
export function AlarmScheduler() {
  const { alarms, toggleEnabledOff } = useAppAlarms();
  useAlarmScheduler(alarms, { onAlarmExpired: toggleEnabledOff });
  return null;
}
