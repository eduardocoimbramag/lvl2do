import {
  Zap,
  BarChart3,
  Layers,
  Sparkles,
  Flame,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { getCharacterImageByTier } from "./characterClasses";

interface ContentCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Seção "Problema → Nosso sistema" — texto do lado "Problema". */
export const problemContent = {
  /** Frase de impacto, exibida em destaque. */
  hook: "Apps de tarefas não falham por falta de funções. Falham porque não dão vontade de voltar amanhã.",
  /** Texto comum, complementar. */
  body: "Você cria uma lista. Marca algumas tarefas. Esquece o app. Abandona a rotina. O problema não é falta de disciplina. É falta de recompensa, progressão e motivo emocional para continuar.",
  /** Tarefas decorativas que "somem" (ilustram o abandono). */
  fadingTasks: ["Beber 2L de água", "Ler 10 páginas", "Treinar 30 min", "Estudar inglês"],
};

export interface SystemStep {
  title: string;
  description: string;
  /** Arte do personagem (Guerreiro) na faixa de nível. */
  image: string;
  level: number;
}

/** Seção "Nosso sistema" — 3 passos com a evolução do Guerreiro. */
export const systemSteps: SystemStep[] = [
  {
    title: "Crie suas missões",
    description: "Organize tarefas por categoria, turno e dificuldade.",
    image: getCharacterImageByTier("Guerreiro", 1),
    level: 1,
  },
  {
    title: "Evolua seu personagem",
    description: "Ganhe XP ao concluir missões, suba de nível ao mesmo tempo que performa na vida real.",
    image: getCharacterImageByTier("Guerreiro", 25),
    level: 25,
  },
  {
    title: "Mantenha seu streak",
    description: "Crie constância, suba no ranking e compartilhe sua evolução com seus amigos.",
    image: getCharacterImageByTier("Guerreiro", 100),
    level: 100,
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
