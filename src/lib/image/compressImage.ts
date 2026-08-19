/**
 * Compressão de imagem no cliente, antes do upload do story.
 *
 * Resolve quatro problemas de uma vez:
 *  1. HEIC do iPhone — nenhum browser renderiza, e o bucket só aceita
 *     jpeg/png/webp. O canvas do Safari iOS decodifica HEIC e emite JPEG.
 *  2. Peso — foto de celular tem 3–8 MB; o bucket corta em 5 MB.
 *  3. Orientação EXIF — sem `imageOrientation: "from-image"` a foto retrato do
 *     iPhone (EXIF 6) sai deitada, porque `createImageBitmap` ignora o EXIF.
 *  4. Teto de área do canvas — o iOS Safari devolve canvas BRANCO, sem erro,
 *     acima de ~16,7 Mpx. Por isso o redimensionamento acontece dentro do
 *     decoder (`resizeWidth`/`resizeHeight`), e nunca alocamos o bitmap cheio.
 */

/**
 * Maior lado da imagem final. 1280 e não 1600: o palco do story tem ~500 px
 * lógicos, o bucket é PRIVADO (sem cache de CDN — toda visualização bate na
 * origem) e o story dura 5 s. Uma imagem de 500 KB não carrega a tempo em 3G.
 */
const MAX_EDGE = 1280;
const QUALITY = 0.75;

/** Acima disto o navegador trava antes mesmo de decodificar (RAW, TIFF). */
const MAX_INPUT_BYTES = 30 * 1024 * 1024;

export interface CompressedImage {
  /** JPEG pronto para upload. */
  blob: Blob;
  width: number;
  height: number;
  /** object URL para preview — quem chama DEVE revogar com URL.revokeObjectURL. */
  previewUrl: string;
}

/** Dimensões finais preservando a proporção. */
function fit(w: number, h: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/** Caminho alternativo para engines sem `createImageBitmap` (Safari antigo). */
async function viaImageElement(file: File): Promise<CompressedImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const { width, height } = fit(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("image_encode_failed");
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await toJpeg(canvas);
    return { blob, width, height, previewUrl: URL.createObjectURL(blob) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  // Libera o backing store: um canvas grande segura memória até o GC passar.
  canvas.width = 0;
  canvas.height = 0;
  // toBlob devolve null sob pressão de memória — silenciosamente.
  if (!blob) throw new Error("image_encode_failed");
  return blob;
}

/**
 * Converte qualquer imagem escolhida pelo usuário num JPEG leve.
 * Lança se o arquivo não for uma imagem decodificável.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  // Erros com chave estável: o composer traduz cada um para uma frase própria.
  if (!file.type.startsWith("image/")) throw new Error("image_unsupported");
  if (file.size > MAX_INPUT_BYTES) throw new Error("image_too_large");

  if (typeof createImageBitmap !== "function") return viaImageElement(file);

  let probe: ImageBitmap;
  try {
    probe = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return viaImageElement(file);
  }
  const { width, height } = fit(probe.width, probe.height);
  probe.close();

  // Redimensiona no decoder: sai da main thread e evita alocar o bitmap cheio.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: "high",
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("image_encode_failed");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await toJpeg(canvas);
  return { blob, width, height, previewUrl: URL.createObjectURL(blob) };
}
