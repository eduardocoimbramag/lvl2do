/**
 * Configuração central do plano de assinatura do lvl2do.
 *
 * Fonte única de verdade para nome, preço, trial e benefícios do plano PRO —
 * usada pelo paywall e (futuramente) pela integração de pagamento (RevenueCat).
 * NÃO há cobrança real nesta etapa; aqui ficam só metadados/conteúdo.
 */

import type { LucideIcon } from "lucide-react";
import {
  Target,
  Sparkles,
  Trophy,
  TrendingUp,
  Store,
  Users,
} from "lucide-react";

/** Identificador do entitlement (direito de acesso) no provedor de pagamento. */
export const PRO_ENTITLEMENT = "pro" as const;

/** Um benefício do plano, para exibir no paywall. */
export interface PlanBenefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Plano PRO — nome, preço, trial e benefícios. */
export const PRO_PLAN = {
  /** nome comercial do plano. */
  name: "lvl2do Pro",
  /** código curto do plano (persistido em profile.plan no futuro). */
  code: "pro",
  /** entitlement esperado no provedor (RevenueCat). */
  entitlement: PRO_ENTITLEMENT,
  /** dias de teste grátis. */
  trialDays: 14,
  /** preço mensal formatado (pt-BR). */
  priceMonthlyLabel: "R$ 14,90",
  /** preço mensal numérico (para cálculos/telemetria futura). */
  priceMonthly: 14.9,
  /** moeda ISO. */
  currency: "BRL",
  /** rótulos curtos de destaque do topo do paywall. */
  highlights: [
    "14 dias grátis",
    "Depois R$ 14,90/mês",
    "Cancele quando quiser",
    "Acesso completo ao seu personagem, missões, ranking, métricas e loja",
  ],
} as const;

/**
 * Benefícios principais do PRO (cards/lista do paywall).
 * Reaproveita os ícones da navegação para manter a linguagem visual.
 */
export const PRO_BENEFITS: PlanBenefit[] = [
  {
    icon: Target,
    title: "Missões ilimitadas",
    description: "Crie quantas missões quiser e conquiste XP todos os dias.",
  },
  {
    icon: Sparkles,
    title: "Evolução completa do personagem",
    description: "XP, nível, streak e skins/classes desbloqueadas.",
  },
  {
    icon: TrendingUp,
    title: "Métricas avançadas",
    description: "Acompanhe sua evolução por dia, semana, mês e categoria.",
  },
  {
    icon: Trophy,
    title: "Ranking global e de amigos",
    description: "Dispute o topo com todos os jogadores e com seus amigos.",
  },
  {
    icon: Store,
    title: "Loja e cristais",
    description: "Troque cristais por produtos físicos exclusivos da guilda.",
  },
  {
    icon: Users,
    title: "Indicações e sistema social",
    description: "Convide amigos, ganhe cristais e cresça em comunidade.",
  },
];

/** Textos de apoio sobre cristais no paywall. */
export const CRYSTAL_COPY = {
  oneDayPerCrystal: "Sem assinatura ativa, 1 cristal libera 1 dia de acesso.",
  earnByReferral: "Convites confirmados geram cristais para continuar jogando.",
} as const;
