"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StoryRing } from "./StoryRing";
import { StoryComposer } from "./StoryComposer";
import { StoryViewer } from "./StoryViewer";
import { useAuth } from "./AuthProvider";
import { toCharacterClass, type StoryRing as StoryRingData } from "@/data/stories";
import { getStoriesFeed, markStoriesViewed, purgeMyStaleStoryObjects } from "@/lib/db/stories";

/**
 * Máscara das bordas do trilho: o conteúdo some nas pontas, mas o fundo roxo
 * da página continua aparecendo. Um degradê sólido por cima viraria uma faixa
 * preta chapada contra o orbe do canto.
 */
const EDGE_MASK =
  "linear-gradient(to right, transparent 0, black 20px, black calc(100% - 40px), transparent 100%)";

/** A limpeza do bucket é por sessão, não por montagem (StrictMode monta 2x). */
let purgedThisSession = false;

/**
 * Trilho de stories da aba Amigos.
 *
 * O item do próprio usuário é SEMPRE o primeiro e sempre existe: quando ainda
 * não há story publicado, ele é sintetizado a partir do profile, para o "+"
 * nunca sumir da tela.
 */
export function StoriesBar() {
  const { user, profile } = useAuth();
  const [rings, setRings] = useState<StoryRingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const [frozen, setFrozen] = useState<StoryRingData[]>([]);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const reload = useCallback(() => {
    return getStoriesFeed()
      .then((rows) => {
        if (aliveRef.current) setRings(rows);
      })
      .catch((e) => console.error("Erro ao carregar stories:", e));
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getStoriesFeed()
      .then((rows) => {
        if (active) setRings(rows);
      })
      .catch((e) => console.error("Erro ao carregar stories:", e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  // Higiene de cota do bucket — nunca bloqueia nada, por isso sem await.
  useEffect(() => {
    if (!user || purgedThisSession) return;
    purgedThisSession = true;
    void purgeMyStaleStoryObjects().catch(() => {});
  }, [user]);

  /** Garante o item próprio na primeira posição, mesmo sem story publicado. */
  const ordered = useMemo<StoryRingData[]>(() => {
    const mine = rings.find((r) => r.isMe);
    const others = rings.filter((r) => !r.isMe);
    if (mine) return [mine, ...others];
    if (!user) return others;
    return [
      {
        author: {
          id: user.id,
          name: profile?.nickname || "Você",
          level: profile?.level ?? 1,
          characterClass: toCharacterClass(profile?.character_class ?? null),
        },
        isMe: true,
        hasUnseen: false,
        stories: [],
        latestAt: new Date(0).toISOString(),
      },
      ...others,
    ];
  }, [rings, user, profile]);

  /** Marca visto localmente (otimista) e persiste sem bloquear a interface. */
  const handleSeen = useCallback((storyIds: string[]) => {
    if (storyIds.length === 0) return;
    const seen = new Set(storyIds);
    setRings((prev) =>
      prev.map((r) => {
        if (!r.stories.some((s) => seen.has(s.id))) return r;
        const stories = r.stories.map((s) => (seen.has(s.id) ? { ...s, seen: true } : s));
        return { ...r, stories, hasUnseen: stories.some((s) => !s.seen) };
      }),
    );
    markStoriesViewed(storyIds).catch((e) =>
      console.error("Erro ao marcar stories como vistos:", e),
    );
  }, []);

  /** O meu é sempre o primeiro; os amigos rolam ao lado. */
  const mineRing = ordered[0];
  const friendRings = ordered.slice(1);

  const openViewer = useCallback(
    (index: number) => {
      setFrozen(ordered);
      setViewerAt(index);
    },
    [ordered],
  );

  if (!user) return null;

  return (
    <div className="relative -mt-2 mb-6">
      <div
        role="group"
        aria-label="Stories dos amigos"
        aria-busy={loading}
        className="-mx-5 flex items-start gap-3.5 px-5 py-1 sm:-mx-8 sm:gap-4 sm:px-8"
      >
        {/* FORA do scroller: o seu story não pode sair da tela ao rolar. */}
        {mineRing && !loading && (
          <StoryRing
            ring={mineRing}
            isOwn
            onOpen={mineRing.stories.length > 0 ? () => openViewer(0) : undefined}
            onCompose={() => setComposerOpen(true)}
          />
        )}

        {/* A máscara de borda só entra quando há algo rolando: aplicada a um
            texto curto, ela comeria as primeiras letras. */}
        {loading ? (
          <div
            className="no-scrollbar -mr-5 flex gap-3.5 overflow-x-auto pr-5 sm:-mr-8 sm:gap-4 sm:pr-8"
            style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
          >
            {/* `animate-pulse` congela sob prefers-reduced-motion, então o
                estado também é anunciado em texto. */}
            <span className="sr-only">Carregando stories…</span>
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                aria-hidden
                className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 sm:w-[84px]"
              >
                <div className="h-14 w-14 animate-pulse rounded-full bg-white/5 sm:h-16 sm:w-16" />
                <div className="h-2.5 w-12 animate-pulse rounded-full bg-white/5" />
              </div>
            ))}
          </div>
        ) : friendRings.length > 0 ? (
          <div
            className="no-scrollbar -mr-5 flex gap-3.5 overflow-x-auto pr-5 sm:-mr-8 sm:gap-4 sm:pr-8"
            style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
          >
            {friendRings.map((ring, i) => (
              <StoryRing
                key={ring.author.id}
                ring={ring}
                onOpen={ring.stories.length > 0 ? () => openViewer(i + 1) : undefined}
              />
            ))}
          </div>
        ) : (
          /* `self-center` alinha com o anel (item mais alto da linha);
             `flex-1` toma a largura restante e o texto centraliza nela. */
          <p className="flex-1 self-center text-balance px-2 text-center text-xs leading-relaxed text-muted/70">
            Seus amigos ainda não publicaram stories hoje.
          </p>
        )}
      </div>

      <StoryComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPublished={reload}
      />

      <StoryViewer
        open={viewerAt !== null}
        rings={frozen}
        startRingIndex={viewerAt ?? 0}
        onClose={() => setViewerAt(null)}
        onSeen={handleSeen}
        onDeleted={reload}
      />
    </div>
  );
}
