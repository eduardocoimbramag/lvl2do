import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — merge conditional class names while resolving Tailwind conflicts.
 * Usage: cn("px-2", condition && "px-4", "text-soft")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a number between a min and max. */
export function clamp(value: number, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

/** Format a percentage from a value/total pair. */
export function toPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return clamp(Math.round((value / total) * 100));
}
