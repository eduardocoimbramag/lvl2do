import { isCharacterClass, type CharacterClass } from "./characterClasses";
import type { Category } from "./types";

/**
 * Tipos e helpers do sistema de stories (24 h, aba Amigos).
 * Os DADOS vêm do Supabase via `@/lib/db/stories` (tabelas `stories`/
 * `story_views` + bucket privado "stories"). Aqui só tipos e utilidades puras.
 */

/** Duração de exibição de um story de imagem (ms) — padrão do Instagram. */
export const STORY_DURATION_MS = 5000;

/** Máximo de stories por usuário a cada 24 h (espelha o trigger no banco). */
export const STORY_LIMIT_PER_DAY = 10;

/**
 * Autor de um story. Slim de propósito: `get_stories_feed()` não devolve
 * XP/país/streak, então exigir `Player` aqui obrigaria a inflar a RPC.
 */
export interface StoryAuthor {
  id: string;
  name: string;
  level: number;
  characterClass: CharacterClass;
}

export interface Story {
  id: string;
  authorId: string;
  /** chave no bucket; usada para assinar a URL e para a limpeza. */
  imagePath: string;
  /** URL assinada (TTL curto), resolvida em lote na camada de dados. */
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  missionId: string | null;
  missionTitle: string | null;
  missionCategory: Category | null;
  createdAt: string;
  expiresAt: string;
  /** já visualizado por mim (vem do servidor; a UI marca otimista). */
  seen: boolean;
  /** quantas pessoas viram — só nos MEUS stories, senão null. */
  viewCount: number | null;
}

/** Um autor e seus stories vivos — é o item do trilho. */
export interface StoryRing {
  author: StoryAuthor;
  isMe: boolean;
  /** true → anel roxo; false → anel cinza. */
  hasUnseen: boolean;
  stories: Story[];
  latestAt: string;
}

/** Categoria da missão, se for uma das conhecidas. */
export function toCategory(value: string | null): Category | null {
  return value === "Profissional" || value === "Pessoal" || value === "Saúde" ? value : null;
}

/** Classe do personagem com fallback (mesma regra de `publicProfileToPlayer`). */
export function toCharacterClass(value: string | null): CharacterClass {
  return isCharacterClass(value) ? value : "Guerreiro";
}

/**
 * Índice inicial ao abrir um autor: primeiro não visto; se tudo visto, começa
 * do zero (rever um story não o torna "não visto" de novo).
 */
export function initialStoryIndex(stories: Story[]): number {
  const i = stories.findIndex((s) => !s.seen);
  return i === -1 ? 0 : i;
}

/** "agora", "12 min", "3 h" — tempo desde a publicação, curto como no Instagram. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h`;
}

/**
 * `alt` gerado a partir da missão marcada. A missão é dado estruturado, então
 * o story fica legível por leitor de tela — coisa que o Instagram não entrega.
 */
export function storyAltText(story: Story, authorName: string): string {
  if (story.missionTitle) {
    const cat = story.missionCategory ? ` — categoria ${story.missionCategory}` : "";
    return `Story de ${authorName} realizando a missão "${story.missionTitle}"${cat}`;
  }
  return `Story de ${authorName}`;
}
