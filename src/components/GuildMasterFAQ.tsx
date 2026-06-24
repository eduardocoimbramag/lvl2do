"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronRight, Wand2 } from "lucide-react";
import { ButtonLink } from "./Button";
import { SectionHeader } from "./Section";
import { fadeUp, inViewport, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Conteúdo do diálogo (edite aqui)                                           */
/* -------------------------------------------------------------------------- */

interface Faq {
  question: string;
  answer: string;
}

const FAQS: Faq[] = [
  {
    question: "O lvl2do funciona em quais plataformas?",
    answer:
      "O lvl2do está sendo desenvolvido para iOS e Android, com foco em uma experiência mobile completa. A ideia é levar suas missões, XP, streak e progresso com você durante o dia.",
  },
  {
    question: "Como funciona o sistema de XP?",
    answer:
      "Cada missão concluída gera XP. Conforme você acumula XP, seu personagem sobe de nível e sua evolução fica visível dentro do app.",
  },
  {
    question: "O que é o streak?",
    answer:
      "Streak é sua sequência de dias ativos. Quanto mais dias você volta, completa missões e mantém constância, mais forte fica sua jornada.",
  },
  {
    question: "O app tem Pomodoro e alarmes?",
    answer:
      "Sim. O lvl2do conta com Modo Focus/Pomodoro para ajudar você a se concentrar em uma missão por vez, além de alarmes para lembrar suas tarefas importantes.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim. Você pode cancelar a assinatura a qualquer momento pela App Store ou Google Play. Se cancelar antes do fim do teste grátis, não será cobrado.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Componente principal                                                       */
/* -------------------------------------------------------------------------- */

export function GuildMasterFAQ() {
  // a primeira pergunta começa ativa por padrão
  const [active, setActive] = useState(0);

  return (
    <>
      <SectionHeader
        title="Pergunte ao Mestre da Guilda"
        subtitle="As respostas essenciais antes de começar sua próxima missão."
      />

      {/* painel de diálogo — borda com gradiente sutil */}
      <div className="relative mt-14 rounded-3xl bg-gradient-to-br from-brand/40 via-white/[0.06] to-sky-500/30 p-px shadow-glow">
        <div className="relative overflow-hidden rounded-[1.65rem] bg-ink-card/80 p-6 backdrop-blur-sm sm:p-10">
          {/* gradientes sutis roxo / azul / preto */}
          <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-brand/20 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-sky-500/10 blur-[110px]" />
          <PixelParticles />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={inViewport}
            className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-12"
          >
            {/* ---------------- ESQUERDA — NPC ---------------- */}
            <motion.div variants={fadeUp}>
              <GuildMaster />
            </motion.div>

            {/* ---------------- DIREITA — diálogo ---------------- */}
            <div>
              <motion.p
                variants={fadeUp}
                className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-muted/70"
              >
                Opções de diálogo
              </motion.p>

              <div className="space-y-3">
                {FAQS.map((faq, i) => {
                  const isActive = active === i;
                  return (
                    <motion.div key={faq.question} variants={fadeUp}>
                      <button
                        type="button"
                        onClick={() => setActive(i)}
                        aria-expanded={isActive}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                          isActive
                            ? "translate-x-1.5 border-brand/50 bg-brand/10 shadow-glow-sm"
                            : "border-white/[0.08] bg-white/[0.02] hover:translate-x-1.5 hover:border-brand/40 hover:bg-white/[0.05]",
                        )}
                      >
                        <ChevronRight
                          size={18}
                          className={cn(
                            "shrink-0 transition-colors",
                            isActive ? "text-brand-light" : "text-muted group-hover:text-brand-light",
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium sm:text-[15px]",
                            isActive ? "text-soft" : "text-soft/80",
                          )}
                        >
                          {faq.question}
                        </span>
                      </button>

                      {/* MOBILE — resposta inline (accordion premium) */}
                      <div className="lg:hidden">
                        <AnimatePresence initial={false}>
                          {isActive && (
                            <SpeechBubble
                              key={`m-${i}`}
                              answer={faq.answer}
                              tailSide="top"
                              className="mt-3"
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* DESKTOP — balão único de fala do NPC */}
              <div className="mt-6 hidden lg:block">
                <AnimatePresence mode="wait">
                  <SpeechBubble key={active} answer={FAQS[active].answer} tailSide="left" />
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ---------------- CTA discreto ---------------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5 }}
        className="mt-12 text-center"
      >
        <p className="font-display text-xl font-semibold text-soft sm:text-2xl">
          Pronto para iniciar sua jornada?
        </p>
        <div className="mt-5 flex justify-center">
          <ButtonLink href="/register" size="lg">
            Começar teste grátis <ArrowRight size={18} />
          </ButtonLink>
        </div>
        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-muted">
          14 dias grátis. Depois R$ 14,90/mês. Renovação automática. Cancele quando quiser.
        </p>
      </motion.div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  NPC — Mestre da Guilda (placeholder)                                        */
/* -------------------------------------------------------------------------- */

function GuildMaster() {
  return (
    <div className="flex flex-col items-center lg:items-start">
      {/* idle: leve flutuação */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        {/* brilho pulsante atrás */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-brand/30 blur-3xl"
          animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.95, 1.06, 0.95] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/*
          ============================================================
          PLACEHOLDER DO NPC — SUBSTITUA POR ARTE PIXEL ART DEFINITIVA
          Troque este bloco por, por exemplo:
            <Image src="/npc/mestre-guilda.webp" alt="Mestre da Guilda"
                   fill className="object-contain" />
          mantendo o wrapper relative/arredondado abaixo.
          ============================================================
        */}
        <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-brand/30 bg-gradient-to-b from-ink-card to-ink shadow-glow sm:h-56 sm:w-56">
          <div className="absolute inset-2 rounded-full border border-white/[0.06]" />
          <div className="absolute inset-0 rounded-full bg-radial-glow opacity-60" />
          <Wand2 className="relative h-20 w-20 text-brand-light sm:h-24 sm:w-24" strokeWidth={1.2} />
        </div>
        {/* ===== FIM DO PLACEHOLDER ===== */}
      </motion.div>

      {/* status do NPC */}
      <div className="mt-7 w-full max-w-xs rounded-2xl border border-white/[0.08] bg-ink-card/70 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <span className="font-display text-sm font-semibold text-soft">Mestre da Guilda</span>
        </div>
        <p className="mt-1 pl-[20px] text-xs text-muted">Online para novos aventureiros</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Balão de fala com efeito de digitação                                      */
/* -------------------------------------------------------------------------- */

function SpeechBubble({
  answer,
  tailSide = "left",
  className,
}: {
  answer: string;
  tailSide?: "left" | "top";
  className?: string;
}) {
  const typed = useTypewriter(answer);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative rounded-2xl border border-brand/25 bg-gradient-to-br from-ink-card to-ink/70 p-5 shadow-glow-sm sm:p-6",
        className,
      )}
    >
      {/* bico do balão (aponta para o NPC) */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute h-3 w-3 rotate-45 bg-ink-card",
          tailSide === "left"
            ? "-left-1.5 top-9 border-b border-l border-brand/25"
            : "-top-1.5 left-9 border-l border-t border-brand/25",
        )}
      />

      {/* a11y: resposta completa anunciada uma vez; texto digitado é decorativo */}
      <div aria-live="polite">
        <span className="sr-only">{answer}</span>
        <p
          aria-hidden="true"
          className="relative min-h-[1.5rem] text-sm leading-relaxed text-soft/90 sm:text-[15px]"
        >
          {typed}
          <motion.span
            className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] bg-brand-light align-middle"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
          />
        </p>
      </div>
    </motion.div>
  );
}

/** Revela o texto caractere a caractere (respeita prefers-reduced-motion). */
function useTypewriter(text: string, speed = 16) {
  const [out, setOut] = useState("");

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setOut(text);
      return;
    }

    setOut("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);

    return () => window.clearInterval(id);
  }, [text, speed]);

  return out;
}

/* -------------------------------------------------------------------------- */
/*  Partículas/pixels decorativos do fundo                                     */
/* -------------------------------------------------------------------------- */

function PixelParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {PIXELS.map((p, i) => (
        <motion.span
          key={i}
          className="absolute bg-brand-light/40"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ opacity: [0, p.opacity, 0], y: [0, -10, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// posições fixas (determinístico — evita hydration mismatch)
const PIXELS = [
  { left: "8%", top: "22%", size: 3, opacity: 0.5, duration: 7, delay: 0 },
  { left: "18%", top: "70%", size: 2, opacity: 0.4, duration: 9, delay: 1.2 },
  { left: "33%", top: "40%", size: 2, opacity: 0.35, duration: 8, delay: 0.6 },
  { left: "47%", top: "82%", size: 3, opacity: 0.45, duration: 10, delay: 2 },
  { left: "61%", top: "28%", size: 2, opacity: 0.4, duration: 7.5, delay: 0.9 },
  { left: "74%", top: "62%", size: 3, opacity: 0.5, duration: 9.5, delay: 1.6 },
  { left: "88%", top: "38%", size: 2, opacity: 0.35, duration: 8.5, delay: 0.3 },
  { left: "94%", top: "78%", size: 2, opacity: 0.4, duration: 11, delay: 2.4 },
];
