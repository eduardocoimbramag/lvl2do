import {
  Briefcase,
  HeartPulse,
  Sparkles,
  Sunrise,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react";
import type { Category, Difficulty, Shift } from "@/data/types";
import { cn } from "@/lib/utils";

/** Mapeamento de ícone + cor por categoria. */
export const categoryMeta: Record<Category, { icon: LucideIcon; classes: string }> = {
  Profissional: { icon: Briefcase, classes: "text-sky-300 bg-sky-400/10 border-sky-400/20" },
  Pessoal: { icon: Sparkles, classes: "text-pink-300 bg-pink-400/10 border-pink-400/20" },
  Saúde: { icon: HeartPulse, classes: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
};

/** Mapeamento de ícone + cor por turno. */
export const shiftMeta: Record<Shift, { icon: LucideIcon; classes: string }> = {
  Manhã: { icon: Sunrise, classes: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
  Tarde: { icon: Sun, classes: "text-orange-300 bg-orange-400/10 border-orange-400/20" },
  Noite: { icon: Moon, classes: "text-indigo-300 bg-indigo-400/10 border-indigo-400/20" },
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

export function ShiftBadge({ shift, className }: { shift: Shift; className?: string }) {
  const { icon: Icon, classes } = shiftMeta[shift];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        classes,
        className,
      )}
    >
      <Icon size={13} />
      {shift}
    </span>
  );
}
