"use client";

import * as React from "react";
import { Award, Check } from "lucide-react";
import { CREDIT_TIERS, tierForCredits, type User } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The learner's credits pill. Click to open a popover explaining every badge tier
 * (credit range + name), highlighting the one they're currently on.
 */
export function CreditBadge({
  user,
  className,
}: {
  user: Pick<User, "learningCredits">;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const credits = user.learningCredits;
  const current = tierForCredits(credits);

  // Derive each badge's inclusive credit range from the tier thresholds.
  const rows = CREDIT_TIERS.map((t, i) => {
    const next = CREDIT_TIERS[i + 1];
    return { label: t.label, min: t.min, max: next ? next.min - 1 : null };
  });
  const currentIndex = rows.findIndex((r) => r.label === current.label);
  const nextTier = rows[currentIndex + 1];
  const toNext = nextTier ? Math.max(0, nextTier.min - credits) : 0;

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-3 py-1.5 text-sm font-semibold text-gold-700"
        title={`${current.label} · ${credits} credits`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Award className="h-4 w-4" />
        {credits}
        <span className="text-gold-500">cr</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-3xl border border-hair bg-card shadow-lift">
            <div className="border-b border-hair px-4 py-3">
              <p className="font-heading font-semibold text-heading">Your badge</p>
              <p className="text-xs text-muted">
                {current.label} · {credits} cr
                {nextTier && (
                  <>
                    {" "}
                    · <span className="font-medium text-gold-600">{toNext} to {nextTier.label}</span>
                  </>
                )}
              </p>
            </div>
            <ul className="p-1.5">
              {rows.map((r) => {
                const isCurrent = r.label === current.label;
                return (
                  <li
                    key={r.label}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5",
                      isCurrent && "bg-gold-50 dark:bg-gold-500/10",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-heading text-sm font-semibold text-heading">{r.label}</span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-navy-900">
                          <Check className="h-3 w-3" /> Current
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-muted">
                      {r.max == null ? `${r.min}+ cr` : `${r.min}–${r.max} cr`}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-hair px-4 py-2.5 text-xs text-faint">
              Earn up to 100 credits for each topic you complete.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
