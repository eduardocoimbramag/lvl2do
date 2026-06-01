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
    description: "Organize por Carreira, Saúde, Estudos, Finanças e Pessoal.",
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

/** Planos. */
export const plans = [
  {
    name: "Free",
    price: "R$ 0",
    description: "Para começar sua jornada de evolução.",
    features: ["Missões básicas", "XP e nível", "Dashboard simples", "Streak diário"],
    cta: { label: "Começar agora", href: "/register" },
    highlighted: false,
  },
  {
    name: "Pro",
    price: "Em breve",
    description: "Para quem quer levar a evolução a sério.",
    features: [
      "Missões ilimitadas",
      "Relatórios avançados",
      "Temas personalizados",
      "Análises inteligentes",
    ],
    cta: { label: "Em breve", href: "#" },
    highlighted: true,
    badge: "Pro",
    disabled: true,
  },
];

export const sparkleIcon = Sparkles;
