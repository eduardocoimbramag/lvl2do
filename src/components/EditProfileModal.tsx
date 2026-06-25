"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";
import { IdentityFields } from "./IdentityFields";
import { Button } from "./Button";
import { useProfileIdentity } from "@/hooks/useProfileIdentity";
import { handleKey, suggestTag, validateIdentity } from "@/data/identity";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
}

/** Modal de edição do perfil — altera nickname + hashtag. */
export function EditProfileModal({ open, onClose }: EditProfileModalProps) {
  const { nickname: curNick, tag: curTag, fallbackName, setIdentity } = useProfileIdentity();
  const [nickname, setNickname] = useState("");
  const [tag, setTag] = useState("");
  const [saving, setSaving] = useState(false);

  // inicializa os campos sempre que o modal abre
  useEffect(() => {
    if (!open) return;
    const initialNick = curNick ?? fallbackName ?? "";
    setNickname(initialNick);
    setTag(curTag ?? suggestTag(initialNick));
  }, [open, curNick, curTag, fallbackName]);

  // permite manter o próprio handle atual sem acusar "já existe"
  const exclude = curNick && curTag ? handleKey(curNick, curTag) : undefined;
  const { ok } = validateIdentity(nickname, tag, exclude);

  async function save() {
    if (!ok || saving) return;
    setSaving(true);
    try {
      await setIdentity(nickname, tag);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
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
            aria-label="Editar perfil"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="card-surface relative w-full max-w-lg rounded-b-none rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-soft">Editar perfil</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-soft"
              >
                <X size={18} />
              </button>
            </div>

            <IdentityFields
              nickname={nickname}
              tag={tag}
              onNicknameChange={setNickname}
              onTagChange={setTag}
              exclude={exclude}
              disabled={saving}
            />

            <div className="mt-7 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={save} disabled={!ok || saving}>
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Salvar
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
