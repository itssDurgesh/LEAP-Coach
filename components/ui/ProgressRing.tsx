import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number; // 0 - 100
  size?: number;
  stroke?: number;
  color?: "gold" | "navy" | "success";
  label?: string;
  className?: string;
}

const colorClass = {
  gold: "text-gold-500",
  navy: "text-navy-600",
  success: "text-success",
};

export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  color = "gold",
  label,
  className,
}: ProgressRingProps) {
  const pct = Math.min(100, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="text-hair"
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          className={cn(
            "transition-[stroke-dashoffset] duration-700 ease-out",
            colorClass[color],
          )}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div
            className="font-heading font-bold leading-none text-heading"
            style={{ fontSize: size * 0.26 }}
          >
            {Math.round(pct)}
            <span className="text-[0.6em] align-top">%</span>
          </div>
          {label && (
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-faint">
              {label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
