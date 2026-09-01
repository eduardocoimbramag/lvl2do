import type { Category } from "@/data/types";

/**
 * Pub/sub módulo-local para "houve conclusão de missão".
 *
 * Fora do React DE PROPÓSITO: o AppStateProvider notifica sem colocar nada no
 * value do contexto — zero re-render em cascata no app inteiro. Só quem estiver
 * montado e inscrito (o BossBattleRow, apenas em /missions) reage.
 */

type Listener = (category: Category) => void;

const listeners = new Set<Listener>();

export function emitBossHit(category: Category) {
  for (const listener of listeners) listener(category);
}

/** Inscreve e devolve o unsubscribe (para o cleanup do efeito). */
export function subscribeBossHits(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
