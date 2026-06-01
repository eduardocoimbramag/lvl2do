import {
  Briefcase,
  HeartPulse,
  GraduationCap,
  Wallet,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Category, Difficulty } from "@/data/types";
import { cn } from "@/lib/utils";

/** Mapeamento de ícone + cor por categoria. */
export const categoryMeta: Record<Category, { icon: LucideIcon; classes: string }> = {
  Carreira: { icon: Briefcase, classes: "text-sky-300 bg-sky-400/10 border-sky-400/20" },
  Saúde: { icon: HeartPulse, classes: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
  Estudos: { icon: GraduationCap, classes: "text-brand-light bg-brand/10 border-brand/20" },
  Finanças: { icon: Wallet, classes: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
  Pessoal: { icon: Sparkles, classes: "text-pink-300 bg-pink-400/10 border-pink-400/20" },
};

export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  const { icon: Icon, classes } = categoryMeta[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        classes,
        className,
      )}
    >
      <Icon size={13} />
      {category}
    </span>
  );
}

const difficultyClasses: Record<Difficulty, string> = {
  Fácil: "text-success bg-success/10 border-success/20",
  Média: "text-amber-300 bg-amber-400/10 border-amber-400/20",
  Difícil: "text-rose-300 bg-rose-400/10 border-rose-400/20",
};

export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        difficultyClasses[difficulty],
        className,
      )}
    >
      {difficulty}
    </span>
  );
}
