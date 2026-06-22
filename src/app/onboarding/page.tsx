"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { ClassSelectGrid } from "@/components/ClassSelectGrid";
import { useCharacterClass } from "@/hooks/useCharacterClass";
import { type CharacterClass } from "@/data/characterClasses";

/**
 * /onboarding — seleção de classe no primeiro login.
 * Tela cheia (sem sidebar). Quem já tem classe é mandado ao dashboard.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, characterClass, setCharacterClass } = useCharacterClass();
  const [selected, setSelected] = useState<CharacterClass | null>(null);
  const [saving, setSaving] = useState(false);

  // Já escolheu (ou não está logado) → não fica preso na tela de onboarding.
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/login");
    } else if (characterClass) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, characterClass, router]);

  async function handleConfirm() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await setCharacterClass(selected);
      router.replace("/dashboard");
    } catch {
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
              Escolha sua classe
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted">
              Defina o personagem que vai representar sua jornada de evolução.
            </p>
          </div>

          {/* 5 cards quadrados — 3 por linha (2 no mobile estreito) */}
          <ClassSelectGrid selected={selected} onSelect={setSelected} disabled={saving} />

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="w-full sm:w-auto sm:min-w-[14rem]"
              onClick={handleConfirm}
              disabled={!selected || saving}
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
            {!selected && (
              <p className="text-xs text-muted">Selecione uma classe para continuar.</p>
            )}
          </div>
        </motion.div>
      </main>
    </>
  );
}
