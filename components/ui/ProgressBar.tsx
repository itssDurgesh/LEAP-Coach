import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0 - 100
  color?: "gold" | "navy" | "success";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const heights = { sm: "h-1.5", md: "h-2", lg: "h-2.5" };
const fills = {
  gold: "bg-gradient-to-r from-gold-400 to-gold-600",
  navy: "bg-gradient-to-r from-navy-600 to-navy-800",
  success: "bg-success",
};

export function ProgressBar({ value, color = "gold", size = "md", className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-cream-200", heights[size], className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-out", fills[color])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
