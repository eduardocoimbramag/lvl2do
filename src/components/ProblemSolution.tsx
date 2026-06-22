"use client";

import Image from "next/image";
import { Fragment } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Frown, ListChecks, Plus, Swords } from "lucide-react";
import { fadeUp, inViewport, staggerContainer } from "@/lib/animations";
import { problemContent, systemSteps, type SystemStep } from "@/data/landingContent";
import { cn } from "@/lib/utils";

/**
 * Seção "Problema × Nosso sistema" (2 cards 50/50).
 * Esquerda: a dor (lista esquecida). Direita: a solução em 3 passos,
 * com setas de varredura sequencial (estilo pisca dinâmico BYD) entre eles.
 */
export function ProblemSolution() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={inViewport}
      className="grid gap-6 lg:grid-cols-2 lg:items-stretch"
    >
      <ProblemCard />
      <SystemCard />
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Esquerda — Problema                                                        */
/* -------------------------------------------------------------------------- */

function ProblemCard() {
  return (
    <motion.div
      variants={fadeUp}
      className="card-surface relative flex flex-col overflow-hidden p-7 sm:p-9"
    >
      <div className="flex items-center justify-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow-sm">
          <Frown size={24} />
        </span>
        <span className="font-display text-lg font-semibold text-brand-light">Problema</span>
      </div>

      {/* frase de impacto */}
      <p className="mt-6 font-display text-xl font-semibold leading-snug text-soft sm:text-2xl">
        {problemContent.hook}
      </p>

      {/* texto comum */}
      <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
        {problemContent.body}
      </p>

      {/* decorativo: "app de lista" abandonado — preenche o restante do card */}
      <div
        className="mt-7 flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]"
        aria-hidden="true"
      >
        {/* barra de título do "app" */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted">
            <ListChecks size={14} /> Lista de tarefas
          </span>
          <span className="text-[10px] text-muted/60">aberta há 5 dias</span>
        </div>

        {/* tarefas que vão "sumindo" + botão fantasma no rodapé */}
        <div className="flex flex-1 flex-col p-4">
          <div className="space-y-2.5">
            {problemContent.fadingTasks.map((task, i) => {
              const done = i < 2;
              return (
                <div
                  key={task}
                  style={{ opacity: 1 - i * 0.2 }}
                  className="flex items-center gap-2.5"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-md",
                      done ? "bg-white/10 text-muted" : "border border-white/15 text-transparent",
                    )}
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span
                    className={cn(
                      "text-xs sm:text-sm",
                      done ? "text-muted line-through" : "text-soft/80",
                    )}
                  >
                    {task}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-muted/40">
            <Plus size={13} /> Adicionar tarefa
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Direita — Nosso sistema                                                    */
/* -------------------------------------------------------------------------- */

function SystemCard() {
  return (
    <motion.div
      variants={fadeUp}
      className="card-surface relative flex flex-col overflow-hidden border-brand/30 p-7 shadow-glow sm:p-9"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/20 blur-[90px]" />

      <div className="relative flex items-center justify-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow-sm">
          <Swords size={24} />
        </span>
        <span className="font-display text-lg font-semibold text-brand-light">Nosso sistema</span>
      </div>

      <div className="relative mt-6 flex flex-col">
        {systemSteps.map((step, i) => (
          <Fragment key={step.title}>
            <StepCard step={step} />
            {i < systemSteps.length - 1 && <SequentialArrow />}
          </Fragment>
        ))}
      </div>
    </motion.div>
  );
}

function StepCard({ step }: { step: SystemStep }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors duration-300 hover:border-brand/30"
    >
      <div className="flex-1">
        <h4 className="font-display text-sm font-semibold text-soft sm:text-base">{step.title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted sm:text-sm">{step.description}</p>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <div className="relative h-16 w-16">
          <div className="absolute inset-1 rounded-full bg-brand/25 blur-lg" />
          <Image
            src={step.image}
            alt={`Guerreiro nível ${step.level}`}
            fill
            sizes="64px"
            className="relative object-contain drop-shadow-[0_4px_14px_rgba(139,92,246,0.45)]"
          />
        </div>
        <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand-light">
          Nível {step.level}
        </span>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Seta de varredura sequencial (estilo pisca dinâmico BYD)                   */
/* -------------------------------------------------------------------------- */

/**
 * Três chevrons que acendem em sequência (top → bottom), criando um efeito de
 * "luz correndo" para baixo, com pausa entre os ciclos. Suave e minimalista.
 */
function SequentialArrow() {
  return (
    <div className="flex justify-center py-2.5" aria-hidden="true">
      <div className="flex flex-col items-center -space-y-[7px]">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="text-brand-light"
            initial={{ opacity: 0.14 }}
            animate={{
              opacity: [0.14, 1, 0.14],
              filter: [
                "drop-shadow(0 0 0px rgba(192,132,252,0))",
                "drop-shadow(0 0 6px rgba(192,132,252,0.9))",
                "drop-shadow(0 0 0px rgba(192,132,252,0))",
              ],
            }}
            transition={{
              duration: 1.4,
              times: [0, 0.4, 1],
              repeat: Infinity,
              repeatDelay: 0.5,
              delay: i * 0.16,
              ease: "easeInOut",
            }}
          >
            <ChevronDown size={16} strokeWidth={2.5} />
          </motion.span>
        ))}
      </div>
    </div>
  );
}
