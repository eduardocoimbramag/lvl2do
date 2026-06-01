"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { DashboardMockup } from "@/components/DashboardMockup";
import { ButtonLink } from "@/components/Button";
import { FeatureCard } from "@/components/FeatureCard";
import { PricingCard } from "@/components/PricingCard";
import { SectionHeader, AnimatedGrid } from "@/components/Section";
import { howItWorks, features, plans } from "@/data/landingContent";
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
              <motion.span variants={fadeUp} className="eyebrow">
                <Sparkles size={13} /> Seu desenvolvimento em jogo
              </motion.span>

              <motion.h1
                variants={fadeUp}
                className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-soft sm:text-5xl lg:text-6xl"
              >
                Transforme sua rotina em{" "}
                <span className="text-gradient">missões</span>.
                <br className="hidden sm:block" /> Evolua um nível por dia.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted lg:mx-0 sm:text-lg"
              >
                Organize tarefas pessoais e profissionais, ganhe XP ao concluir missões,
                mantenha sua sequência diária e acompanhe sua evolução com dashboards
                simples e inteligentes.
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

              <motion.div
                variants={fadeUp}
                className="mt-8 flex items-center justify-center gap-6 text-sm text-muted lg:justify-start"
              >
                <span>+10 XP por missão fácil</span>
                <span className="h-1 w-1 rounded-full bg-muted/40" />
                <span>Streak diário</span>
                <span className="h-1 w-1 rounded-full bg-muted/40" />
                <span>Free para começar</span>
              </motion.div>
            </motion.div>

            <div className="relative">
              <DashboardMockup />
            </div>
          </div>
        </section>

        {/* ---------------- COMO FUNCIONA ---------------- */}
        <section id="como-funciona" className="scroll-mt-24 py-20 sm:py-28">
          <div className="container-page">
            <SectionHeader
              eyebrow="Como funciona"
              title="Quatro passos para evoluir"
              subtitle="Um fluxo simples que transforma sua produtividade em um jogo de evolução contínua."
            />
            <AnimatedGrid className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {howItWorks.map((item, i) => (
                <FeatureCard key={item.title} {...item} step={i + 1} />
              ))}
            </AnimatedGrid>
          </div>
        </section>

        {/* ---------------- RECURSOS ---------------- */}
        <section id="recursos" className="scroll-mt-24 py-20 sm:py-28">
          <div className="container-page">
            <SectionHeader
              eyebrow="Recursos"
              title="Tudo para manter sua evolução no ritmo"
              subtitle="Ferramentas pensadas para tornar a constância natural e a evolução visível."
            />
            <AnimatedGrid className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((item) => (
                <FeatureCard key={item.title} {...item} />
              ))}
            </AnimatedGrid>
          </div>
        </section>

        {/* ---------------- PLANOS ---------------- */}
        <section id="planos" className="scroll-mt-24 py-20 sm:py-28">
          <div className="container-page">
            <SectionHeader
              eyebrow="Planos"
              title="Comece grátis, evolua quando quiser"
              subtitle="Tudo que você precisa para começar — sem cartão de crédito."
            />
            <AnimatedGrid className="mx-auto mt-14 grid max-w-3xl gap-6 md:grid-cols-2">
              {plans.map((plan) => (
                <PricingCard key={plan.name} {...plan} />
              ))}
            </AnimatedGrid>
          </div>
        </section>

        {/* ---------------- CTA FINAL ---------------- */}
        <section className="py-20 sm:py-28">
          <div className="container-page">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="card-surface relative overflow-hidden px-8 py-16 text-center shadow-glow sm:px-16"
            >
              <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-brand/25 blur-[100px]" />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-soft sm:text-4xl">
                  Comece sua jornada de evolução hoje.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-muted">
                  Crie sua primeira missão, ganhe XP e suba de nível. Sua melhor versão começa com um nível por dia.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <ButtonLink href="/register" size="lg" className="w-full sm:w-auto">
                    Começar agora <ArrowRight size={18} />
                  </ButtonLink>
                  <ButtonLink href="/login" variant="secondary" size="lg" className="w-full sm:w-auto">
                    Já tenho conta
                  </ButtonLink>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
