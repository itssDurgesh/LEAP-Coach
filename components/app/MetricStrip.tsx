import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Metric {
  label: string;
  value: ReactNode;
  /** Small trailing unit, e.g. "cr". */
  unit?: string;
  /** Optional thin bar or note under the value. */
  foot?: ReactNode;
}

const COLS = {
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
} as const;

/**
 * Compact KPI row: hairline-divided cells in a single bordered strip.
 *
 * Replaces the tall stat panels the learner pages used to carry. Those put three
 * short numbers in a full-width box with generous padding, which read as an
 * oversized empty card rather than a dashboard metric.
 *
 * The 1px dividers come from `gap-px` over a `bg-hair` container, so there is no
 * per-cell border arithmetic to get wrong as the grid reflows.
 */
export function MetricStrip({
  metrics,
  cols = 3,
  className,
}: {
  metrics: Metric[];
  cols?: keyof typeof COLS;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hair bg-hair",
        COLS[cols],
        className,
      )}
    >
      {metrics.map((m) => (
        <div key={m.label} className="min-w-0 bg-card px-4 py-3.5">
          {/* Wraps rather than truncates: at 375px a three-up strip gives each cell
              ~134px of text width, which clips labels like "Catalogs unlocked". */}
          <p className="text-[11px] font-medium uppercase leading-tight tracking-[0.08em] text-faint sm:tracking-[0.1em]">
            {m.label}
          </p>
          <p className="mt-1.5 font-heading text-xl font-bold leading-none tabular-nums text-heading">
            {m.value}
            {m.unit && <span className="ml-1 text-xs font-medium text-faint">{m.unit}</span>}
          </p>
          {m.foot && <div className="mt-2">{m.foot}</div>}
        </div>
      ))}
    </div>
  );
}
