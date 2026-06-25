import {
  LayoutDashboard,
  Target,
  AlarmClock,
  Brain,
  TrendingUp,
  Users,
  Trophy,
  User,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** rótulo curto opcional (usado na navegação inferior do mobile). */
  shortLabel?: string;
}

/** Itens da sidebar / navegação interna do app (desktop: todos). */
export const appNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Missões", href: "/missions", icon: Target },
  { label: "Alarmes", href: "/alarms", icon: AlarmClock },
  { label: "Modo Foco", href: "/focus", icon: Brain, shortLabel: "Foco" },
  { label: "Métricas/Progresso", href: "/progress", icon: TrendingUp, shortLabel: "Métricas" },
  { label: "Amigos", href: "/friends", icon: Users },
  { label: "Ranking", href: "/ranking", icon: Trophy },
  { label: "Perfil", href: "/profile", icon: User },
  { label: "Suporte", href: "/support", icon: LifeBuoy },
];

/**
 * Subconjunto exibido na navegação inferior do mobile (espaço limitado).
 * Mantém os 5 destinos mais usados; Métricas e Suporte ficam só no desktop.
 */
export const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortLabel: "Início" },
  { label: "Missões", href: "/missions", icon: Target },
  { label: "Modo Foco", href: "/focus", icon: Brain, shortLabel: "Foco" },
  { label: "Alarmes", href: "/alarms", icon: AlarmClock },
  { label: "Perfil", href: "/profile", icon: User },
];

/** Links de âncora da landing page. */
export const landingNav = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Recursos", href: "#recursos" },
  { label: "Planos", href: "#planos" },
];
