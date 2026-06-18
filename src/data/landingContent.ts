import {
  ListChecks,
  Zap,
  TrendingUp,
  BarChart3,
  Layers,
  Sparkles,
  Flame,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";

interface ContentCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Seção "Como funciona" — 4 passos. */
export const howItWorks: ContentCard[] = [
  {
    icon: ListChecks,
    title: "Crie missões",
    description: "Transforme tarefas pessoais e profissionais em missões com categoria e dificuldade.",
  },
  {
    icon: Zap,
    title: "Ganhe XP",
    description: "Cada missão concluída rende XP automaticamente, de acordo com a dificuldade.",
  },
  {
    icon: Trophy,
    title: "Suba de nível",
    description: "Acumule XP, suba de nível e desbloqueie sua evolução dia após dia.",
  },
  {
    icon: TrendingUp,
    title: "Acompanhe o progresso",
    description: "Visualize sua evolução com dashboards simples e inteligentes.",
  },
];

/** Seção "Recursos" — 6 cards. */
export const features: ContentCard[] = [
  {
    icon: Layers,
    title: "Missões por categoria",
    description: "Organize por Profissional, Pessoal e Saúde.",
  },
  {
    icon: Zap,
    title: "XP automático",
    description: "Receba pontos de experiência ao concluir cada missão, sem esforço manual.",
  },
  {
    icon: Trophy,
    title: "Level up",
    description: "Evolua de nível conforme acumula XP e mantenha a motivação em alta.",
  },
  {
    icon: Flame,
    title: "Streak diário",
    description: "Mantenha sua sequência de dias ativos e crie o hábito da constância.",
  },
  {
    icon: BarChart3,
    title: "Dashboard de progresso",
    description: "Acompanhe XP, missões e desempenho semanal em um só lugar.",
  },
  {
    icon: Target,
    title: "Áreas fortes e fracas",
    description: "Descubra onde você está evoluindo melhor e onde precisa equilibrar.",
  },
];

/** Plano Pro — card único de destaque (texto + arte + CTAs). */
export const proPlan = {
  eyebrow: "Plano Pro",
  title: "Tudo desbloqueado para evoluir sem limites",
  description:
    "Um único plano com acesso completo. Comece com 14 dias grátis e leve sua evolução a sério.",
  features: [
    "Missões ilimitadas",
    "Todas as classes desbloqueadas",
    "Evolução visual do personagem",
    "Modo Focus/Pomodoro",
    "Alarmes inteligentes",
    "Gráficos de progresso",
  ],
  ctas: [
    {
      label: "Começar teste grátis",
      note: "14 dias grátis. Depois R$ 14,90/mês. Renovação automática. Cancele quando quiser.",
      href: "/register",
      variant: "primary" as const,
    },
    {
      label: "R$ 8,32/mês no plano anual",
      note: "Economize escolhendo o plano anual. R$ 99,90/ano",
      href: "/register",
      variant: "outline" as const,
    },
  ],
};

export const sparkleIcon = Sparkles;
