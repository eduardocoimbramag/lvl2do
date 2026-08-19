"use client";

import { passwordStrength } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

/**
 * Barra de força da senha — feedback orientativo (não bloqueia o envio).
 * Some quando o campo está vazio para não poluir o formulário.
 */
export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const { score, label, barClass, textClass } = passwordStrength(password);

  return (
    <div aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < score ? barClass : "bg-white/10",
            )}
          />
        ))}
      </div>
      <p className={cn("mt-1.5 text-xs", textClass)}>Força da senha: {label}</p>
    </div>
  );
}
