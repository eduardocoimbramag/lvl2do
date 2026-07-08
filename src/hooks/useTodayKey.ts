"use client";

import { useEffect, useState } from "react";
import { getLocalDateKey } from "@/lib/xp-system";

/**
 * "Day tick" — devolve a chave do dia local ("YYYY-MM-DD") como ESTADO,
 * atualizada automaticamente quando o dia vira com o app aberto.
 *
 * Por que existe: sem isso, memos/derivações que capturam `new Date()` ficam
 * presos ao dia antigo depois da meia-noite (auditoria A2) — missões "de hoje",
 * XP diário, calendário e streak só atualizavam ao recarregar. Use este valor
 * como dependência de qualquer cálculo que dependa de "hoje".
 *
 * Também re-checa ao focar a aba/janela (acordar de suspensão, trocar de aba
 * perto da meia-noite etc.), além do intervalo periódico.
 */
export function useTodayKey(): string {
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey(new Date()));

  useEffect(() => {
    const check = () => {
      const k = getLocalDateKey(new Date());
      setTodayKey((prev) => (prev === k ? prev : k));
    };

    const id = window.setInterval(check, 30_000); // checa 2x/min
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  return todayKey;
}
