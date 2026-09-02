import type { Category } from "@/data/types";
import type { BossBattleState } from "@/types/database";

/**
 * Pub/sub módulo-local para "uma missão foi concluída e o boss levou dano".
 *
 * Fora do React DE PROPÓSITO: o AppStateProvider notifica sem colocar nada no
 * value do contexto — zero re-render em cascata no app inteiro. Só quem estiver
 * montado e inscrito (a coreografia, apenas em /missions) reage.
 *
 * O evento carrega o ESTADO AUTORITATIVO devolvido por complete_mission_atomic:
 * o trigger do dano roda na mesma transação, então quando o retorno é montado o
 * HP novo já está commitado. Isso dispensa qualquer palpite do cliente sobre
 * ter havido dano (teto de 5/dia, boss morto, re-conclusão barrada).
 */

export interface BossHitEvent {
  category: Category;
  /** dano REAL aplicado. 0 = cap diário, boss morto, ou ledger barrou. */
  damage: number;
  /** estado pós-golpe. null = RPC anterior a esta migração → ouvinte refaz o fetch. */
  boss: BossBattleState | null;
}

type Listener = (event: BossHitEvent) => void;

const listeners = new Set<Listener>();

export function emitBossHit(event: BossHitEvent) {
  for (const listener of listeners) listener(event);
}

/** Inscreve e devolve o unsubscribe (para o cleanup do efeito). */
export function subscribeBossHits(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
