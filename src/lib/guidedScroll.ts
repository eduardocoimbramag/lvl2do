import { animate } from "framer-motion";
import { EASE_HOUSE, EASE_TRAVEL } from "./animations";

/**
 * Rolagem conduzida: leva um elemento ao centro da faixa útil e desiste no
 * instante em que o usuário demonstra querer outra coisa.
 *
 * Usa um tween próprio, e não scrollIntoView com behavior "smooth", por dois
 * motivos: o fim é conhecido (o evento "scrollend" não existe no Safari antigo)
 * e o alvo é clampado por nós, então sabemos que é alcançável.
 */

/** Quanto um elemento fixo/sticky realmente cobre da viewport agora. */
function coverTop(el: HTMLElement | null): number {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  // display:none (md:hidden) devolve tudo zero — não cobre nada.
  if (r.height === 0) return 0;
  // A topbar é sticky, não fixed: com scrollY perto de 0 ela está no fluxo e
  // não sobrepõe nada. O rect.bottom captura isso sozinho.
  return Math.max(0, Math.min(r.bottom, window.innerHeight));
}

function coverBottom(el: HTMLElement | null): number {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  if (r.height === 0) return 0;
  return Math.max(0, window.innerHeight - Math.max(0, r.top));
}

/** Faixa útil entre a topbar e a navegação inferior. Medida, sem breakpoint. */
export function bandInsets() {
  const top = coverTop(document.querySelector<HTMLElement>("[data-app-topbar]"));
  const bottom = coverBottom(document.querySelector<HTMLElement>("[data-app-bottomnav]"));
  return { top, bottom, band: Math.max(0, window.innerHeight - top - bottom) };
}

/** O elemento cabe INTEIRO na faixa útil? (2px de folga contra zoom fracionário) */
export function isFramed(el: HTMLElement): boolean {
  const { top, bottom } = bandInsets();
  const r = el.getBoundingClientRect();
  return r.top >= top - 2 && r.bottom <= window.innerHeight - bottom + 2;
}

/** scrollY que centraliza o elemento na faixa útil, clampado ao documento. */
export function centerYFor(el: HTMLElement): number {
  const { top, band } = bandInsets();
  const r = el.getBoundingClientRect();
  const wanted = window.scrollY + r.top + r.height / 2 - (top + band / 2);
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(Math.max(0, wanted), max);
}

export interface GuidedScroll {
  /** resolve no fim natural, no gesto do usuário ou no cancel. Nunca pendura. */
  done: Promise<void>;
  cancel: () => void;
}

export function guidedScrollTo(targetY: number): GuidedScroll {
  const from = window.scrollY;
  const distance = Math.abs(targetY - from);
  if (distance < 8) return { done: Promise.resolve(), cancel: () => {} };

  let finish: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });

  const controls = animate(from, targetY, {
    duration: Math.min(0.95, Math.max(0.38, 0.28 + distance / 2600)),
    // viagem longa pede ease-in-out (tangente inicial 0); curta usa a da casa.
    ease: distance > 600 ? EASE_TRAVEL : EASE_HOUSE,
    // "instant" é obrigatório: globals.css tem html { scroll-behavior: smooth }.
    // Sem isso cada frame do tween dispara OUTRO scroll suave nativo, e o
    // resultado é um efeito de borracha. "auto" não serve — herda o smooth.
    onUpdate: (v) => window.scrollTo({ top: v, behavior: "instant" }),
    onComplete: () => settle(),
  });

  // Detecção de INTENÇÃO, não de efeito: eventos "scroll" são idênticos para
  // rolagem programática e humana. Nunca damos preventDefault nem travamos.
  const interactive = (t: EventTarget | null) =>
    t instanceof HTMLElement &&
    !!t.closest('button,a,input,textarea,select,[role="switch"],[contenteditable]');

  const NAV_KEYS = new Set(["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"]);

  const onKey = (e: KeyboardEvent) => {
    // Espaço fica de fora: num botão focado ele ATIVA o botão — é a próxima
    // conclusão da sequência, não um pedido de parar a rolagem.
    if (!interactive(e.target) && NAV_KEYS.has(e.key)) settle();
  };
  // mousedown só aborta FORA de controles: clicar no próximo "Concluir" é
  // justamente quando o usuário mais quer ver a arena.
  const onMouseDown = (e: MouseEvent) => {
    if (!interactive(e.target)) settle();
  };
  const onGesture = () => settle();

  function settle() {
    controls.stop();
    window.removeEventListener("wheel", onGesture);
    window.removeEventListener("touchstart", onGesture);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("keydown", onKey);
    finish();
  }

  window.addEventListener("wheel", onGesture, { passive: true, once: true });
  window.addEventListener("touchstart", onGesture, { passive: true, once: true });
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("keydown", onKey);

  return { done, cancel: settle };
}
