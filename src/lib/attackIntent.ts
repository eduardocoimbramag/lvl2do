/**
 * Intenção de rolagem, capturada NO CLIQUE e consumida uma única vez.
 *
 * O evento de dano chega 200–800ms depois do clique (o RTT da RPC). Sem essa
 * âncora, o app não distingue "o usuário acabou de concluir uma missão" de
 * qualquer outra origem, e a página se moveria sozinha em situações em que ele
 * nem tocou no botão. Guardamos também a posição do clique, para não puxar a
 * tela quando ele já estava abaixo das arenas.
 */

interface AttackIntent {
  /** posição vertical do clique na viewport, em px. */
  y: number;
  at: number;
}

/** Além disto, o clique é velho demais para justificar mover a tela. */
const MAX_AGE_MS = 4000;

let intent: AttackIntent | null = null;

export function armAttackIntent(y: number, now: number) {
  intent = { y, at: now };
}

export function clearAttackIntent() {
  intent = null;
}

/** Devolve e descarta. Null se não há intenção, ou se ela envelheceu. */
export function consumeAttackIntent(now: number): AttackIntent | null {
  const current = intent;
  intent = null;
  if (!current) return null;
  return now - current.at <= MAX_AGE_MS ? current : null;
}
