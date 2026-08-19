import { createClient } from "@/lib/supabase/client";
import { toCategory, toCharacterClass } from "@/data/stories";
import type { Story, StoryRing } from "@/data/stories";
import type { StoriesFeedRow, StoriesFeedStoryJson } from "@/types/database";

/**
 * Camada de dados dos stories (24 h).
 * O bucket "stories" é PRIVADO: a imagem só é servida por URL assinada, e a
 * assinatura acontece sob demanda (ver `signStories`). Ver supabase/2026-stories.sql.
 */

const BUCKET = "stories";

/**
 * TTL da URL assinada.
 *
 * Curto de propósito: resgatar uma URL assinada NÃO reavalia RLS — o token vale
 * pela assinatura. Se um amigo te remove, os links que ele já emitiu continuam
 * funcionando até vencer. 5 min cobre uma sessão de visualização e limita essa
 * janela. Quando vence com a aba aberta, o viewer reassina sozinho.
 */
const SIGNED_TTL_S = 300;

/** uuid v4 — `crypto.randomUUID` só existe em secure context (https/localhost). */
function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0"));
  return [
    h.slice(0, 4).join(""),
    h.slice(4, 6).join(""),
    h.slice(6, 8).join(""),
    h.slice(8, 10).join(""),
    h.slice(10).join(""),
  ].join("-");
}

/* -------------------------------- Feed ----------------------------------- */

/** Item jsonb da RPC → story do app. */
function feedStoryToStory(json: StoriesFeedStoryJson, authorId: string): Story {
  return {
    id: json.id,
    authorId,
    imagePath: json.imagePath,
    imageUrl: null,
    width: json.width,
    height: json.height,
    caption: json.caption,
    missionId: json.missionId,
    missionTitle: json.missionTitle,
    missionCategory: toCategory(json.missionCategory),
    createdAt: json.createdAt,
    expiresAt: json.expiresAt,
    seen: json.seen,
    viewCount: json.viewCount,
  };
}

/** Linha da RPC → item do trilho. */
function feedRowToRing(row: StoriesFeedRow): StoryRing {
  const name = row.nickname && row.nickname.length > 0 ? row.nickname : "Jogador";
  return {
    author: {
      id: row.author_id,
      name,
      level: row.level,
      characterClass: toCharacterClass(row.character_class),
    },
    isMe: row.is_me,
    hasUnseen: row.has_unseen,
    stories: (row.stories ?? []).map((s) => feedStoryToStory(s, row.author_id)),
    latestAt: row.latest_at,
  };
}

/**
 * Stories vivos dos amigos (+ os meus), agrupados por autor e já ordenados
 * pela RPC (eu primeiro, depois não vistos, depois mais recentes).
 *
 * NÃO assina as imagens: o trilho desenha o avatar do personagem, que é arte
 * local. Assinar tudo aqui geraria centenas de tokens HMAC por visita à página
 * sem que um único fosse usado. Quem assina é o viewer, ao abrir um autor.
 */
export async function getStoriesFeed(): Promise<StoryRing[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_stories_feed");
  if (error) throw error;
  return ((data ?? []) as StoriesFeedRow[]).map(feedRowToRing);
}

/**
 * Assina as imagens de um conjunto de stories. Devolve um array NOVO — `Story`
 * é tratado como imutável no estado do viewer.
 *
 * Erro por item não lança: `createSignedUrls` só rejeita falha de transporte;
 * um path negado pela RLS volta como item com `signedUrl: null`. Por isso o
 * casamento é por `path`, nunca por índice — a ordem do array vem do servidor.
 */
export async function signStories(stories: Story[]): Promise<Story[]> {
  if (stories.length === 0) return stories;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(stories.map((s) => s.imagePath), SIGNED_TTL_S);
  if (error) throw error;

  const urlByPath = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
  }
  return stories.map((s) => ({ ...s, imageUrl: urlByPath.get(s.imagePath) ?? null }));
}

/* ------------------------------ Visualização ----------------------------- */

/**
 * Marca stories como vistos. A UI já mudou o anel de forma otimista, então
 * falha aqui não quebra nada — e reenviar é inofensivo (o banco faz upsert).
 */
export async function markStoriesViewed(storyIds: string[]): Promise<void> {
  if (storyIds.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_stories_viewed", { p_story_ids: storyIds });
  if (error) throw error;
}

/* -------------------------------- Publicar -------------------------------- */

export interface CreateStoryInput {
  /** JPEG já comprimido pelo cliente (ver @/lib/image/compressImage). */
  file: Blob;
  width: number;
  height: number;
  missionId: string | null;
}

/**
 * Publica um story: PRIMEIRO a linha, DEPOIS o arquivo.
 *
 * A ordem é de segurança, não de estilo. A policy de upload exige que já exista
 * uma linha com aquele `image_path`; como a linha passa pelo trigger de cota,
 * é a cota que passa a governar o storage. Se o upload viesse antes, um loop de
 * uploads sem insert encheria o bucket sem limite nenhum.
 */
export async function createStory(input: CreateStoryInput): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const id = newId();
  // O banco tem um CHECK amarrando este path a (user_id, id) — não invente outro.
  const path = `${user.id}/${id}.jpg`;

  // `expires_at`, `mission_title` e `mission_category` são preenchidos pelo
  // trigger: mandá-los do cliente seria confiar no cliente.
  const { error: insErr } = await supabase.from("stories").insert({
    id,
    user_id: user.id,
    image_path: path,
    width: input.width,
    height: input.height,
    mission_id: input.missionId,
  });
  if (insErr) throw insErr;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.file, { contentType: "image/jpeg", upsert: false });

  if (upErr) {
    // Sem arquivo o story não existe de fato: desfaz a linha.
    await supabase.from("stories").delete().eq("id", id);
    throw upErr;
  }
}

/** Apaga um story meu (linha e arquivo). */
export async function deleteStory(storyId: string, imagePath: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("stories").delete().eq("id", storyId);
  if (error) throw error;
  // Se o remove falhar, a limpeza preguiçosa pega depois.
  await supabase.storage.from(BUCKET).remove([imagePath]);
}

/* --------------------------------- Limpeza -------------------------------- */

/**
 * Apaga do bucket os arquivos meus já expirados ou órfãos.
 *
 * `delete from storage.objects` no SQL só remove o metadado, não o arquivo —
 * por isso a limpeza mora no cliente. É higiene de cota, nunca corretude:
 * nenhuma query devolve story expirado. Falha aqui é silenciosa de propósito.
 */
export async function purgeMyStaleStoryObjects(): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_my_stale_story_objects");
  if (error) {
    console.warn("Não foi possível listar stories expirados:", error.message);
    return;
  }
  const paths = ((data ?? []) as { path: string }[]).map((r) => r.path).filter(Boolean);
  if (paths.length === 0) return;
  const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths);
  if (rmErr) console.warn("Não foi possível apagar stories expirados:", rmErr.message);
}
