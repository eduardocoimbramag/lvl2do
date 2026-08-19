"use client";

import { useId } from "react";
import type { CharacterBackgroundId } from "@/data/characterBackgrounds";
import { cn } from "@/lib/utils";

/**
 * Cenário vetorial atrás do personagem.
 *
 * Tudo é SVG: a moldura aparece de 56 px (trilho de stories) a 176 px (perfil),
 * e uma imagem raster ou ficaria borrada num extremo ou pesada no outro.
 *
 * Regra de composição: o centro-baixo — onde o personagem fica — é sempre o
 * ponto mais escuro e mais limpo do cenário. Detalhe e contraste ficam nas
 * bordas, senão a silhueta se perde no fundo.
 *
 * Os `id` de gradiente são únicos por instância porque `useId()` os isola: o
 * seletor renderiza os quatro fundos na mesma tela, e `id` de SVG é global no
 * documento — repetir faria um gradiente sobrescrever o outro.
 */

interface CharacterBackdropProps {
  background: CharacterBackgroundId;
  className?: string;
}

export function CharacterBackdrop({ background, className }: CharacterBackdropProps) {
  // `useId` devolve algo como ":r3:" — o dois-pontos atrapalha em seletor CSS.
  const uid = useId().replace(/:/g, "");

  if (background === "none") return null;

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={cn("absolute inset-0 h-full w-full", className)}
    >
      {background === "castelo" && <Castelo uid={uid} />}
      {background === "trono" && <Trono uid={uid} />}
      {background === "floresta" && <Floresta uid={uid} />}
    </svg>
  );
}

/* --------------------------------- Muralha -------------------------------- */

/**
 * Pedra de castelo iluminada por tocha. As fiadas são alternadas (junta
 * desencontrada), como alvenaria real — fiadas alinhadas parecem azulejo.
 */
function Castelo({ uid }: { uid: string }) {
  const rows = 7;
  const rowH = 100 / rows;

  return (
    <>
      <defs>
        <linearGradient id={`${uid}-stone`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#3B3A46" />
          <stop offset="55%" stopColor="#2A2933" />
          <stop offset="100%" stopColor="#17171F" />
        </linearGradient>
        <radialGradient id={`${uid}-torch`} cx="0.18" cy="0.12" r="0.7">
          <stop offset="0%" stopColor="#F5A55B" stopOpacity="0.42" />
          <stop offset="45%" stopColor="#C77A3A" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#C77A3A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-vig`} cx="0.5" cy="0.62" r="0.78">
          <stop offset="45%" stopColor="#05050A" stopOpacity="0" />
          <stop offset="100%" stopColor="#05050A" stopOpacity="0.9" />
        </radialGradient>
      </defs>

      <rect width="100" height="100" fill={`url(#${uid}-stone)`} />

      {/* fiadas de pedra: junta desencontrada a cada linha */}
      <g opacity="0.55">
        {Array.from({ length: rows }, (_, r) => {
          const y = r * rowH;
          const offset = r % 2 === 0 ? 0 : -12.5;
          return (
            <g key={r}>
              <line
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="#0C0C12"
                strokeWidth="0.9"
                strokeLinecap="square"
              />
              {Array.from({ length: 5 }, (_, c) => (
                <line
                  key={c}
                  x1={offset + c * 25}
                  y1={y}
                  x2={offset + c * 25}
                  y2={y + rowH}
                  stroke="#0C0C12"
                  strokeWidth="0.9"
                />
              ))}
              {/* brilho no topo de cada bloco: dá volume à pedra */}
              <line
                x1="0"
                y1={y + 0.9}
                x2="100"
                y2={y + 0.9}
                stroke="#5A5868"
                strokeWidth="0.5"
                opacity="0.5"
              />
            </g>
          );
        })}
      </g>

      <rect width="100" height="100" fill={`url(#${uid}-torch)`} />
      <rect width="100" height="100" fill={`url(#${uid}-vig)`} />
    </>
  );
}

/* ------------------------------ Salão do trono ---------------------------- */

/**
 * Arco ogival com luz entrando e dois estandartes. O arco fica atrás da
 * cabeça do personagem e a luz desce — a silhueta ganha recorte natural.
 */
function Trono({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-hall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#241B3D" />
          <stop offset="60%" stopColor="#150F26" />
          <stop offset="100%" stopColor="#0A0714" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C084FC" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#8B5CF6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id={`${uid}-shaft`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C084FC" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#C084FC" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-banner`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#4C1D95" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id={`${uid}-vig`} cx="0.5" cy="0.68" r="0.75">
          <stop offset="40%" stopColor="#05050A" stopOpacity="0" />
          <stop offset="100%" stopColor="#05050A" stopOpacity="0.92" />
        </radialGradient>
      </defs>

      <rect width="100" height="100" fill={`url(#${uid}-hall)`} />

      {/* janela ogival central */}
      <path
        d="M50 8 C64 8 72 20 72 32 L72 62 L28 62 L28 32 C28 20 36 8 50 8 Z"
        fill={`url(#${uid}-glass)`}
      />
      {/* montante e travessa da janela */}
      <path d="M50 10 L50 62" stroke="#1B1230" strokeWidth="1.6" opacity="0.8" />
      <path d="M29 38 L71 38" stroke="#1B1230" strokeWidth="1.6" opacity="0.8" />
      {/* moldura de pedra do arco */}
      <path
        d="M50 8 C64 8 72 20 72 32 L72 62 L28 62 L28 32 C28 20 36 8 50 8 Z"
        fill="none"
        stroke="#3A2E57"
        strokeWidth="2.4"
      />

      {/* facho de luz descendo da janela */}
      <path d="M30 60 L70 60 L84 100 L16 100 Z" fill={`url(#${uid}-shaft)`} />

      {/* estandartes laterais, com a ponta chanfrada */}
      <path d="M6 6 L20 6 L20 52 L13 45 L6 52 Z" fill={`url(#${uid}-banner)`} />
      <path d="M80 6 L94 6 L94 52 L87 45 L80 52 Z" fill={`url(#${uid}-banner)`} />

      {/* piso */}
      <rect y="86" width="100" height="14" fill="#0A0714" opacity="0.85" />
      <line x1="0" y1="86" x2="100" y2="86" stroke="#3A2E57" strokeWidth="0.8" opacity="0.6" />

      <rect width="100" height="100" fill={`url(#${uid}-vig)`} />
    </>
  );
}

/* -------------------------------- Floresta -------------------------------- */

/**
 * Mata enevoada ao luar, em três planos de profundidade. Cada plano é mais
 * escuro e mais alto que o anterior — é o que cria a sensação de distância.
 */
function Floresta({ uid }: { uid: string }) {
  /** Faixa de coníferas em zigue-zague: `h` é a altura dos picos. */
  function trees(baseY: number, h: number, step: number) {
    let d = `M0 100 L0 ${baseY}`;
    for (let x = 0; x <= 100; x += step) {
      d += ` L${x + step / 2} ${baseY - h} L${x + step} ${baseY}`;
    }
    return `${d} L100 100 Z`;
  }

  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16303A" />
          <stop offset="55%" stopColor="#0E1F28" />
          <stop offset="100%" stopColor="#08131A" />
        </linearGradient>
        <radialGradient id={`${uid}-moon`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#DDF3FF" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#BFE6FF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#BFE6FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-fog`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9FD9E8" stopOpacity="0" />
          <stop offset="50%" stopColor="#9FD9E8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#9FD9E8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-vig`} cx="0.5" cy="0.65" r="0.78">
          <stop offset="42%" stopColor="#05050A" stopOpacity="0" />
          <stop offset="100%" stopColor="#05050A" stopOpacity="0.9" />
        </radialGradient>
      </defs>

      <rect width="100" height="100" fill={`url(#${uid}-sky)`} />

      {/* lua e seu halo */}
      <circle cx="74" cy="20" r="18" fill={`url(#${uid}-moon)`} />
      <circle cx="74" cy="20" r="6" fill="#E8F6FF" opacity="0.9" />

      {/* três planos de mata, do mais distante ao mais próximo */}
      <path d={trees(58, 16, 20)} fill="#10242E" opacity="0.9" />
      <path d={trees(70, 20, 16)} fill="#0B1A22" opacity="0.95" />
      <path d={trees(84, 24, 12)} fill="#060F15" />

      {/* faixas de névoa entre os planos */}
      <rect y="52" width="100" height="14" fill={`url(#${uid}-fog)`} />
      <rect y="70" width="100" height="16" fill={`url(#${uid}-fog)`} opacity="0.8" />

      <rect width="100" height="100" fill={`url(#${uid}-vig)`} />
    </>
  );
}
