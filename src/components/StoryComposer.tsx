"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ImagePlus, Loader2, Target, AlertCircle } from "lucide-react";
import { Button } from "./Button";
import { ModalPortal } from "./ModalPortal";
import { useAppMissions } from "@/hooks/AppStateProvider";
import { compressImage, type CompressedImage } from "@/lib/image/compressImage";
import { createStory } from "@/lib/db/stories";
import { cn } from "@/lib/utils";

interface StoryComposerProps {
  open: boolean;
  onClose: () => void;
  /** recarrega o trilho após publicar. */
  onPublished: () => void;
}

/** Traduz os erros de leitura/compressão da imagem. */
function messageForImageError(e: unknown): string {
  const msg = String((e as { message?: string })?.message ?? "");
  if (msg.includes("image_unsupported")) return "Formato não suportado. Use JPG ou PNG.";
  if (msg.includes("image_too_large")) return "Essa imagem é grande demais. Escolha outra.";
  if (msg.includes("image_encode_failed")) {
    return "Não foi possível processar a imagem. Tente uma foto menor.";
  }
  return "Não foi possível ler essa imagem. Tente outra.";
}

/** Traduz os erros lançados pelo trigger do banco. */
function messageForPublishError(e: unknown): string {
  const msg = String((e as { message?: string })?.message ?? "");
  if (msg.includes("story_limit_reached")) {
    return "Você já publicou 10 stories nas últimas 24 h. Tente de novo mais tarde.";
  }
  if (msg.includes("mission_not_owned")) return "Essa missão não é sua.";
  if (msg.includes("exceeded the maximum allowed size")) {
    return "A imagem ficou grande demais. Escolha outra foto.";
  }
  return "Não foi possível publicar. Tente de novo.";
}

/**
 * Modal de publicação do story: escolher a foto, marcar a missão e publicar.
 * Dois passos no mesmo painel — escolher e revisar.
 */
export function StoryComposer({ open, onClose, onPublished }: StoryComposerProps) {
  const { missions } = useAppMissions();
  const [image, setImage] = useState<CompressedImage | null>(null);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guarda a URL viva para revogar sem depender da ordem dos efeitos.
  const previewRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // O backdrop fecha o modal mesmo durante o upload: sem esta guarda, o
  // setState pós-await ressuscita estado de um componente desmontado.
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const clearPreview = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
  }, []);

  // Revoga o object URL ao desmontar — senão a imagem fica na memória.
  useEffect(() => clearPreview, [clearPreview]);

  // Zera tudo ao fechar, para a próxima abertura começar limpa.
  useEffect(() => {
    if (open) return;
    clearPreview();
    setImage(null);
    setMissionId(null);
    setError(null);
    setPublishing(false);
    setPreparing(false);
  }, [open, clearPreview]);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Permite reescolher o MESMO arquivo depois de trocar de ideia.
    e.target.value = "";
    if (!file) return;
    setError(null);
    setPreparing(true);
    try {
      const result = await compressImage(file);
      clearPreview();
      previewRef.current = result.previewUrl;
      setImage(result);
    } catch (e) {
      if (aliveRef.current) setError(messageForImageError(e));
    } finally {
      if (aliveRef.current) setPreparing(false);
    }
  }

  async function handlePublish() {
    if (!image || publishing) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError("Você está offline. Conecte-se para publicar.");
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      await createStory({
        file: image.blob,
        width: image.width,
        height: image.height,
        missionId,
      });
      onPublished();
      onClose();
    } catch (e) {
      if (!aliveRef.current) return;
      setError(messageForPublishError(e));
      setPublishing(false);
    }
  }

  return (
    <ModalPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Novo story"
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="card-surface relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-soft">Novo story</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-soft"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="-mr-2 space-y-5 overflow-y-auto pr-2">
                {!image ? (
                  /* Passo A — escolher a foto. Sem `capture`: assim o celular
                     oferece câmera E galeria, em vez de forçar a câmera. */
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={preparing}
                    className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-60"
                  >
                    {preparing ? (
                      <Loader2 size={28} className="animate-spin text-brand-light" />
                    ) : (
                      <ImagePlus size={28} className="text-brand-light" />
                    )}
                    <span className="text-sm text-muted">
                      {preparing ? "Preparando a imagem…" : "Toque para tirar ou escolher uma foto"}
                    </span>
                  </button>
                ) : (
                  /* Passo B — revisar e marcar a missão. */
                  <>
                    <div className="relative aspect-[9/16] max-h-[46vh] w-full overflow-hidden rounded-2xl bg-ink">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.previewUrl}
                        alt="Pré-visualização do seu story"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="absolute bottom-3 right-3 rounded-xl border border-white/15 bg-black/60 px-3 py-1.5 text-xs font-medium text-soft backdrop-blur-md transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                      >
                        Trocar foto
                      </button>
                    </div>

                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
                        <Target size={13} className="text-brand-light" />
                        Marcar missão <span className="text-muted/60">(opcional)</span>
                      </p>
                      {missions.length === 0 ? (
                        <p className="text-xs text-muted/70">Nenhuma missão para hoje.</p>
                      ) : (
                        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                          {missions.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setMissionId((cur) => (cur === m.id ? null : m.id))}
                              aria-pressed={missionId === m.id}
                              className={cn(
                                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                                missionId === m.id
                                  ? "border-brand/50 bg-brand/15 text-brand-light"
                                  : "border-white/10 bg-white/5 text-muted hover:text-soft",
                              )}
                            >
                              {m.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {error && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                  >
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </p>
                )}
              </div>

              {/* input único fora do fluxo: os dois botões acionam por ref. */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={handlePick}
              />

              <div className="mt-6 flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={onClose}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handlePublish} disabled={!image || publishing}>
                  {publishing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Publicando…
                    </>
                  ) : (
                    "Publicar"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
