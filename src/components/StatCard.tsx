"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { fadeUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
  tone?: "brand" | "success";
}

/** Card de estatística com hover premium (glow + leve elevação). */
export function StatCard({ label, value, hint, icon: Icon, className, tone = "brand" }: StatCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn("card-glow group p-5", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              tone === "success"
                ? "bg-success/10 text-success"
                : "bg-brand/10 text-brand-light group-hover:bg-brand/20",
            )}
          >
            <Icon className="h-4.5 w-4.5" size={18} />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-soft">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </motion.div>
  );
}
