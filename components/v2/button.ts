import { cn } from "@/lib/utils";

// Pure (non-client) helper, so server components can call it too. `ui.tsx` is a
// client module and re-exports it for the learner pages.

type ButtonVariant = "primary" | "strong" | "outline" | "ghost" | "ghostOnNavy";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-[#E9B93E] text-navy-800 hover:bg-[#F4CB5B] hover:shadow-v2-gold",
  strong: "bg-v2-strong text-v2-on-strong hover:opacity-90",
  outline: "border border-v2-line-strong bg-card text-heading hover:border-heading",
  ghost: "text-heading hover:bg-surface-2",
  ghostOnNavy: "text-white hover:bg-white/10",
};

/** Class string for a pill button or link. */
export function v2Button(variant: ButtonVariant = "primary", size: "md" | "sm" = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
    size === "md" ? "px-6 py-3.5 text-[15px] leading-5" : "px-4 py-2 text-[13px] leading-5",
    BUTTON_VARIANTS[variant],
    className,
  );
}
