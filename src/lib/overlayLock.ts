/**
 * Trava de shell para overlays imersivos.
 *
 * POR QUE COM CONTADOR DE REFERÊNCIA
 *
 * Cada overlay salvando/restaurando `body.style.overflow` por conta própria
 * produz restauração fora de ordem. E `inert` em `document.body.firstElementChild`
 * (o que o StoryViewer faz) isola só a raiz do app — o portal de OUTRO overlay é
 * IRMÃO no body e continua alcançável por Tab. Aqui inertamos todos os irmãos
 * que não sejam o próprio overlay, com contagem por nó, para que fechar o de
 * baixo não desinerte o de cima.
 *
 * Só o LevelUpOverlay usa esta trava por enquanto — o StoryViewer NÃO foi
 * migrado (refatorar um componente que funciona não pertence a uma entrega de
 * level up). Os dois convivem: o StoryViewer salva "" e põe hidden; nós salvamos
 * "hidden" e repomos "hidden" ao sair; ele repõe "" por último. Ordem correta.
 */

let depth = 0;
let savedOverflow = "";
let savedPaddingRight = "";
const counts = new WeakMap<HTMLElement, number>();

/** Nós que nunca devem ser inertados. */
const SKIP = new Set(["SCRIPT", "STYLE", "LINK", "TEMPLATE", "NEXTJS-PORTAL"]);

function inertOthers(self: HTMLElement | null): HTMLElement[] {
  const marked: HTMLElement[] = [];
  for (const el of Array.from(document.body.children)) {
    const node = el as HTMLElement;
    // NEXTJS-PORTAL é o overlay de erro do dev: inertá-lo deixa a stack trace
    // visível e não clicável exatamente quando você mais precisa dela.
    if (node === self || SKIP.has(node.tagName)) continue;
    const n = (counts.get(node) ?? 0) + 1;
    counts.set(node, n);
    if (n === 1) node.setAttribute("inert", "");
    marked.push(node);
  }
  return marked;
}

/**
 * Trava o app por trás de um overlay. Devolve a função de destravar.
 * `self` = o nó raiz do overlay (filho direto do body, via ModalPortal).
 */
export function lockAppShell(self: HTMLElement | null): () => void {
  depth += 1;
  if (depth === 1) {
    savedOverflow = document.body.style.overflow;
    savedPaddingRight = document.body.style.paddingRight;
    // compensa a barra de rolagem para a página não "pular"
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  }

  const marked = inertOthers(self);

  return () => {
    for (const node of marked) {
      const n = (counts.get(node) ?? 1) - 1;
      if (n <= 0) {
        counts.delete(node);
        node.removeAttribute("inert");
      } else {
        counts.set(node, n);
      }
    }
    depth -= 1;
    if (depth === 0) {
      document.body.style.overflow = savedOverflow;
      document.body.style.paddingRight = savedPaddingRight;
    }
  };
}
