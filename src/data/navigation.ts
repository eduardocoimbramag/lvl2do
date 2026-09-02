import { ALARMS_ENABLED } from "./alarms";
import {
  LayoutDashboard,
  Target,
  AlarmClock,
  Brain,
  TrendingUp,
  Users,
  Trophy,
  Store,
  User,
  LifeBuoy,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** rótulo curto opcional (usado na navegação inferior do mobile). */
  shortLabel?: string;
  /**
   * Destino ainda não disponível: o item continua visível (para o usuário saber
   * que vem aí), mas não navega e não recebe foco de teclado.
   */
  disabled?: boolean;
  /** selo à direita do rótulo, ex.: "Em breve". Só faz sentido com disabled. */
  badge?: string;
}

/** Itens da sidebar / navegação interna do app (desktop: todos). */
export const appNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Missões", href: "/missions", icon: Target },
  {
    label: "Alarmes",
    href: "/alarms",
    icon: AlarmClock,
    disabled: !ALARMS_ENABLED,
    badge: ALARMS_ENABLED ? undefined : "Em breve",
  },
  { label: "Modo Foco", href: "/focus", icon: Brain, shortLabel: "Foco" },
  { label: "Métricas/Progresso", href: "/progress", icon: TrendingUp, shortLabel: "Métricas" },
  { label: "Amigos", href: "/friends", icon: Users },
  { label: "Ranking", href: "/ranking", icon: Trophy },
  { label: "Loja", href: "/store", icon: Store },
  { label: "Perfil", href: "/profile", icon: User },
  { label: "Suporte", href: "/support", icon: LifeBuoy },
  { label: "Configurações", href: "/settings", icon: Settings },
];

/**
 * Subconjunto exibido na navegação inferior do mobile (espaço limitado).
 * Mantém os 5 destinos mais usados; Métricas e Suporte ficam só no desktop.
 */
export const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortLabel: "Início" },
  { label: "Missões", href: "/missions", icon: Target },
  { label: "Modo Foco", href: "/focus", icon: Brain, shortLabel: "Foco" },
  // Alarmes sai daqui enquanto estiver pausado: na barra inferior não cabe o
  // selo "Em breve" (rótulo de 10px) e um slot morto em cinco é desperdício.
  // Configurações ocupa a vaga — sem isso o mobile não alcança /settings.
  ALARMS_ENABLED
    ? { label: "Alarmes", href: "/alarms", icon: AlarmClock }
    : { label: "Configurações", href: "/settings", icon: Settings, shortLabel: "Ajustes" },
  { label: "Perfil", href: "/profile", icon: User },
];

/** Links de âncora da landing page. */
export const landingNav = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Recursos", href: "#recursos" },
  { label: "Planos", href: "#planos" },
];
