import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "gold"
  | "navy"
  | "success"
  | "warning"
  | "neutral"
  | "outline"
  | "trending";

const variants: Record<BadgeVariant, string> = {
  gold: "bg-gold-100 text-gold-700 border-gold-200",
  navy: "bg-navy-50 text-navy-700 border-navy-100",
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-orange-50 text-orange-700 border-orange-200",
  neutral: "bg-cream-100 text-ink-soft border-cream-200",
  outline: "bg-white/80 text-navy-600 border-navy-200",
  trending:
    "bg-gradient-to-r from-orange-500 to-gold-500 text-white border-transparent shadow-sm",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "neutral", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
