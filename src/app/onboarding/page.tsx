"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { ClassSelectGrid } from "@/components/ClassSelectGrid";
import { IdentityFields } from "@/components/IdentityFields";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { useProfileIdentity } from "@/hooks/useProfileIdentity";
import { suggestTag, validateIdentity } from "@/data/identity";
import { type CharacterClass } from "@/data/characterClasses";

/**
 * /onboarding — primeiro login: o jogador define o NOME (nickname + hashtag)
 * e escolhe a CLASSE. Quem já tem classe é mandado ao dashboard.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, characterClass, setCharacterClass } = useCharacterClass();
  const { fallbackName, setIdentity } = useProfileIdentity();

  const [selected, setSelected] = useState<CharacterClass | null>(null);
  const [nickname, setNickname] = useState("");
  const [tag, setTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Já escolheu (ou não está logado) → não fica preso na tela de onboarding.
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/login");
    } else if (characterClass) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, characterClass, router]);

  // Sugere nickname (a partir do nome do Clerk) + hashtag livre, uma única vez.
  useEffect(() => {
    if (initRef.current || !isLoaded || !isSignedIn) return;
    initRef.current = true;
    const base = fallbackName ?? "";
    setNickname(base);
    setTag(suggestTag(base));
  }, [isLoaded, isSignedIn, fallbackName]);

  const identityOk = validateIdentity(nickname, tag).ok;
  const canConfirm = !!selected && identityOk && !saving;

  async function handleConfirm() {
    if (!canConfirm) return;
    setSaving(true);
    setError(null);
    try {
      await setIdentity(nickname, tag);
      await setCharacterClass(selected!);
      router.replace("/dashboard");
    } catch (err) {
      console.error("Falha ao confirmar onboarding:", err);
      const e = err as { code?: string; message?: string };
      setError(
        e?.code === "23505"
          ? "Essa hashtag já está em uso para esse nickname. Tente outra."
          : e?.message || "Não foi possível salvar. Tente novamente.",
      );
      setSaving(false);
    }
  }

  // Enquanto carrega o usuário ou redireciona, mostra um loader leve.
  if (!isLoaded || !isSignedIn || characterClass) {
    return (
      <>
        <AnimatedBackground />
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="animate-spin text-muted" size={28} />
        </main>
      </>
    );
  }

  return (
    <>
      <AnimatedBackground />
      <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-3xl"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo size="lg" href={undefined} />
            <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-soft sm:text-4xl">
              Crie seu personagem
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted">
              Defina seu nome de aventureiro e escolha a classe que vai representar sua jornada.
            </p>
          </div>

          {/* nome de aventureiro (nickname + hashtag) */}
          <div className="card-surface mb-6 p-5 sm:p-6">
            <h2 className="mb-4 font-display text-sm font-semibold text-soft">
              Nome de aventureiro
            </h2>
            <IdentityFields
              nickname={nickname}
              tag={tag}
              onNicknameChange={setNickname}
              onTagChange={setTag}
              disabled={saving}
            />
          </div>

          {/* seleção de classe — 5 cards quadrados */}
          <h2 className="mb-4 font-display text-sm font-semibold text-soft">Escolha sua classe</h2>
          <ClassSelectGrid selected={selected} onSelect={setSelected} disabled={saving} />

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="w-full sm:w-auto sm:min-w-[14rem]"
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Confirmando...
                </>
              ) : (
                <>
                  <Check size={18} /> Confirmar
                </>
              )}
            </Button>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {!saving && (!identityOk || !selected) && (
              <p className="text-xs text-muted">
                {!identityOk
                  ? "Defina um nickname e uma hashtag válidos."
                  : "Selecione uma classe para continuar."}
              </p>
            )}
          </div>
        </motion.div>
      </main>
    </>
  );
}
