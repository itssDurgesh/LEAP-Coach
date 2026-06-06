import { cn } from "@/lib/utils";

// Pure (non-client) button styling helper — safe to import from both
// server and client components, unlike the "use client" Button module.

export type ButtonVariant = "primary" | "navy" | "outline" | "ghost" | "subtle" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: "bg-gold-500 text-navy-900 hover:bg-gold-400 active:bg-gold-600 shadow-sm hover:shadow-gold",
  navy: "bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900 shadow-sm",
  outline: "border border-hair bg-card text-heading hover:bg-surface-2",
  ghost: "text-heading hover:bg-surface-2",
  subtle: "bg-surface-2 text-heading hover:brightness-95 dark:hover:brightness-110",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
};

export const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-5 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
};

export const buttonBase =
  "inline-flex items-center justify-center font-heading font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none";

/** Class string for the button look — apply to <Link>, <a>, or <button>. */
export function buttonClasses(opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    buttonBase,
    buttonVariantClasses[opts?.variant ?? "primary"],
    buttonSizeClasses[opts?.size ?? "md"],
    opts?.className,
  );
}
