"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { DashboardMockup } from "@/components/DashboardMockup";
import { ButtonLink } from "@/components/Button";
import { ProblemSolution } from "@/components/ProblemSolution";
import { ClassShowcase } from "@/components/ClassShowcase";
import { ProShowcase } from "@/components/ProShowcase";
import { GuildMasterFAQ } from "@/components/GuildMasterFAQ";
import { SectionHeader } from "@/components/Section";
import { fadeUp, staggerContainer } from "@/lib/animations";

export default function LandingPage() {
  return (
    <>
      <AnimatedBackground />
      <Header />

      <main>
        {/* ---------------- HERO ---------------- */}
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
          <div className="container-page grid items-center gap-14 lg:grid-cols-2">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="text-center lg:text-left"
            >
              <motion.h1
                variants={fadeUp}
                className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-soft sm:text-5xl lg:text-6xl"
              >
                Transforme sua rotina em uma jornada de{" "}
                <span className="text-gradient">RPG</span>.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted lg:mx-0 sm:text-lg"
              >
                Organize suas tarefas como missões e evolua seu personagem enquanto evolui
                na vida real. Acompanhe seu progresso com dashboards inteligentes.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
              >
                <ButtonLink href="/register" size="lg" className="w-full sm:w-auto">
                  Começar agora <ArrowRight size={18} />
                </ButtonLink>
                <ButtonLink href="/dashboard" variant="secondary" size="lg" className="w-full sm:w-auto">
                  Ver demonstração
                </ButtonLink>
              </motion.div>

            </motion.div>

            <div className="relative">
              <DashboardMockup />
            </div>
          </div>
        </section>

        {/* ---------------- PROBLEMA × NOSSO SISTEMA ---------------- */}
        <section id="como-funciona" className="scroll-mt-24 py-20 sm:py-28">
          <div className="container-page">
            <ProblemSolution />
          </div>
        </section>

        {/* ---------------- CLASSES ---------------- */}
        <section id="recursos" className="scroll-mt-24 py-20 sm:py-28">
          <div className="container-page">
            <ClassShowcase />
          </div>
        </section>

        {/* ---------------- PLANOS ---------------- */}
        <section id="planos" className="scroll-mt-24 py-20 sm:py-28">
          <div className="container-page">
            <SectionHeader
              title="Um plano, evolução sem limites"
              subtitle="Tudo desbloqueado. Comece com 14 dias grátis e cancele quando quiser."
            />
            <ProShowcase />
          </div>
        </section>

        {/* ---------------- FAQ — MESTRE DA GUILDA ---------------- */}
        <section id="faq" className="scroll-mt-24 py-20 sm:py-28">
          <div className="container-page">
            <GuildMasterFAQ />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
