"use client";

import { Dices, AlertCircle } from "lucide-react";
import { NICK_MAX, TAG_LEN, sanitizeTag, suggestTag, validateIdentity } from "@/data/identity";
import { cn } from "@/lib/utils";

interface IdentityFieldsProps {
  nickname: string;
  tag: string;
  onNicknameChange: (value: string) => void;
  onTagChange: (value: string) => void;
  /** handle atual a ignorar na checagem de unicidade (ao editar). */
  exclude?: string;
  disabled?: boolean;
}

/**
 * Campos de identidade reutilizáveis (nickname + hashtag), com validação,
 * preview e gerador de hashtag. Usado no onboarding e no "Editar perfil".
 */
export function IdentityFields({
  nickname,
  tag,
  onNicknameChange,
  onTagChange,
  exclude,
  disabled,
}: IdentityFieldsProps) {
  const { nickError, tagError } = validateIdentity(nickname, tag, exclude);
  // só mostra erro depois que o usuário digitou algo no respectivo campo
  const showNick = nickname.length > 0 ? nickError : null;
  const showTag = tag.length > 0 ? tagError : null;
  const error = showNick ?? showTag;

  const inputBase =
    "rounded-xl border border-white/10 bg-ink text-sm text-soft placeholder:text-muted/60 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60";

  return (
    <div>
      <div className="flex items-end gap-2.5">
        {/* nickname */}
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-xs text-muted">Nickname</label>
          <input
            value={nickname}
            onChange={(e) => onNicknameChange(e.target.value)}
            disabled={disabled}
            maxLength={NICK_MAX}
            placeholder="Seu nome de aventureiro"
            className={cn(inputBase, "w-full px-4 py-2.5")}
          />
        </div>

        {/* hashtag */}
        <div className="w-32 shrink-0">
          <label className="mb-1.5 block text-xs text-muted">Hashtag</label>
          <div
            className={cn(
              "flex items-center rounded-xl border border-white/10 bg-ink pl-2.5 pr-1 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/30",
              disabled && "opacity-60",
            )}
          >
            <span className="text-sm text-muted">#</span>
            <input
              value={tag}
              onChange={(e) => onTagChange(sanitizeTag(e.target.value))}
              disabled={disabled}
              maxLength={TAG_LEN}
              placeholder="ABC"
              className="w-full min-w-0 bg-transparent py-2.5 text-sm font-semibold uppercase tracking-[0.2em] text-soft placeholder:font-normal placeholder:tracking-normal placeholder:text-muted/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onTagChange(suggestTag(nickname))}
              disabled={disabled}
              aria-label="Gerar hashtag aleatória"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-brand-light"
            >
              <Dices size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* preview + erro */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-xs text-muted">
          Identificador:{" "}
          <span className="font-display font-semibold text-soft">
            {nickname.trim() || "Nick"}
            <span className="text-brand-light">#{(tag || "ABC").toUpperCase()}</span>
          </span>
        </p>
        {error && (
          <p className="inline-flex items-center gap-1 text-xs text-red-400">
            <AlertCircle size={12} /> {error}
          </p>
        )}
      </div>

      <p className="mt-1.5 text-[11px] leading-relaxed text-muted/80">
        O nickname pode se repetir — a hashtag de 3 caracteres é o que te torna único.
      </p>
    </div>
  );
}
