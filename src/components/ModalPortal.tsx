"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renderiza o conteúdo direto no <body>, fora da árvore onde foi declarado.
 *
 * POR QUE ISSO É NECESSÁRIO
 *
 * `.card-surface` usa `backdrop-blur`. Pelo CSS, qualquer elemento com
 * `backdrop-filter` diferente de `none` vira **bloco de contenção** dos
 * descendentes `position: fixed` — o mesmo vale para `transform`, `filter`,
 * `perspective` e `contain`.
 *
 * Consequência: um modal `fixed inset-0` declarado dentro de um card não cobre
 * a tela; ele fica preso à caixa do card (e recortado, se o card tiver
 * `overflow-hidden`). Foi o que acontecia ao editar uma missão pré-configurada.
 *
 * Renderizar no <body> tira o modal de baixo de qualquer ancestral problemático,
 * então `fixed` volta a se referir à viewport — independente de onde o
 * componente for usado.
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // No servidor não existe `document`; o portal só pode existir após montar.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
