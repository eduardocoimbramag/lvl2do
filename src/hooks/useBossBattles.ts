"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useAppStats } from "@/hooks/AppStateProvider";
import { getBossBattles, collectBossTreasure } from "@/lib/db/bossBattles";
import { subscribeBossHits } from "@/lib/bossEvents";
import type { Category } from "@/data/types";
import type { BossBattleState } from "@/types/database";

export type BossBattlesStatus = "loading" | "ready" | "error";

/**
 * Estado das 3 arenas TBH (Profissional/Pessoal/Saúde).
 *
 * Server-truth apenas — SEM dano otimista: o cliente não sabe prever a
 * re-conclusão pós-revert (o ledger barra), o sexto hit do dia (cap) nem a
 * conclusão retroativa. O refetch pós-conclusão chega 1 roundtrip depois e a
 * barra anima do valor antigo ao novo — lê como o "eco" do golpe.
 */
export function useBossBattles() {
  // Gate por sessão: o provider monta antes do auth resolver — sem o gate, o
  // primeiro fetch em cold start morreria com not_authenticated.
  const { user } = useAuth();
  const { todayKey } = useAppStats(); // vira nas 00h locais → refetch
  const [status, setStatus] = useState<BossBattlesStatus>("loading");
  const [bosses, setBosses] = useState<Record<Category, BossBattleState> | null>(null);
  const [collecting, setCollecting] = useState<Category | null>(null);
  /** descarta respostas fora de ordem (refetches encadeados). */
  const seq = useRef(0);

  const refetch = useCallback(() => {
    const mySeq = ++seq.current;
    getBossBattles(todayKey)
      .then((rows) => {
        if (mySeq !== seq.current) return; // resposta velha — ignora
        setBosses(
          Object.fromEntries(rows.map((r) => [r.category, r])) as Record<
            Category,
            BossBattleState
          >,
        );
        setStatus("ready");
      })
      .catch((e) => {
        console.error("Erro ao carregar os bosses:", e);
        // erro com dados já carregados: mantém o último estado bom
        if (mySeq === seq.current) setStatus((s) => (s === "ready" ? s : "error"));
      });
  }, [todayKey]);

  // mount (com sessão) + virada de dia (todayKey está nas deps de refetch)
  useEffect(() => {
    if (user) refetch();
  }, [user, refetch]);

  // conclusão de missão em qualquer tela com o Row montado (colunas E calendário)
  useEffect(() => subscribeBossHits(() => refetch()), [refetch]);

  // volta a esta aba: ressincroniza (ex.: boss coletado noutra aba)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetch]);

  const collect = useCallback(
    async (category: Category) => {
      setCollecting(category);
      try {
        const next = await collectBossTreasure(category, todayKey);
        // O retorno da RPC é mais novo que QUALQUER refetch em voo — invalida-os,
        // senão uma resposta velha (hp=0) regravaria o overlay de morte por cima
        // do reset recém-feito.
        seq.current++;
        setBosses((prev) => (prev ? { ...prev, [category]: next } : prev));
      } catch {
        // ex.: boss_not_defeated (reset já feito noutra aba) — ressincroniza em
        // silêncio; o refetch corrige o overlay sozinho.
        refetch();
      } finally {
        setCollecting(null);
      }
    },
    [todayKey, refetch],
  );

  return { status, bosses, refetch, collect, collecting };
}
