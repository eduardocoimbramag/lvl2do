import {
  LayoutDashboard,
  Target,
  TrendingUp,
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

/** Itens da sidebar / navegação interna do app. */
export const appNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Missões", href: "/missions", icon: Target },
  { label: "Métricas/Progresso", href: "/progress", icon: TrendingUp, shortLabel: "Métricas" },
  { label: "Perfil", href: "/profile", icon: User },
  { label: "Suporte", href: "/support", icon: LifeBuoy },
];

/** Links de âncora da landing page. */
export const landingNav = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Recursos", href: "#recursos" },
  { label: "Planos", href: "#planos" },
];
