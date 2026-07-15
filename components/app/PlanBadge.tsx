"use client";

import * as React from "react";
import Link from "next/link";
import { Crown, Sparkles, Check, ArrowRight } from "lucide-react";
import { planFor, type PlanTier, type User } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<PlanTier, string> = {
  free: "border-hair bg-surface-2 text-muted",
  pro: "border-navy-100 bg-navy-50 text-navy-700 dark:border-white/10 dark:bg-white/10 dark:text-heading",
  proPlus: "border-gold-200 bg-gold-100 text-gold-700 dark:bg-gold-500/15",
  max: "border-transparent bg-gradient-to-r from-gold-500 to-navy-600 text-white shadow-sm",
};

// The four plans, in upgrade order, with how many catalogs each unlocks.
const PLAN_ROWS: { tier: PlanTier; label: string; catalogs: number }[] = [
  { tier: "free", label: "Free", catalogs: 0 },
  { tier: "pro", label: "Pro", catalogs: 1 },
  { tier: "proPlus", label: "Pro+", catalogs: 2 },
  { tier: "max", label: "Max", catalogs: 3 },
];

/** Human description for a plan row — the current plan reads "…you are currently on…". */
function describe(tier: PlanTier, isCurrent: boolean): string {
  if (tier === "free") {
    return isCurrent
      ? "You're on the free plan — browse the catalog and preview topics."
      : "Browse the catalog and preview topics for free.";
  }
  if (tier === "max") {
    return isCurrent
      ? "This is our all-access plan, which you are currently on — unlocking all 3 catalogs."
      : "This is our all-access plan, unlocking all 3 catalogs.";
  }
  const n = tier === "pro" ? "1 catalog" : "2 catalogs";
  return isCurrent
    ? `This plan, which you are currently on, unlocks ${n}.`
    : `This plan unlocks ${n}.`;
}

/**
 * The learner's current plan, by catalogs owned: Free / Pro (1) / Pro+ (2) / Max (3).
 * - Pass `href` (e.g. "/pricing") to make it a tappable link.
 * - Pass `withMenu` to open a popover explaining every plan (highlighting the current one).
 */
export function PlanBadge({
  user,
  href,
  withMenu = false,
  showLabel = true,
  className,
}: {
  user: Pick<User, "subscriptionPlan" | "ownedCategories"> | null | undefined;
  href?: string;
  withMenu?: boolean;
  showLabel?: boolean;
  className?: string;
}) {
  const plan = planFor(user);
  const Icon = plan.tier === "max" ? Crown : plan.tier === "free" ? null : Sparkles;

  const pill = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold leading-5",
        STYLES[plan.tier],
        !href && !withMenu && className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {showLabel && <span>{plan.label}</span>}
    </span>
  );

  if (withMenu) {
    return <PlanMenu currentTier={plan.tier} pill={pill} className={className} />;
  }

  if (href) {
    return (
      <Link
        href={href}
        className={cn("inline-flex", className)}
        title={`Your plan: ${plan.label} · view plans`}
        aria-label={`Plan: ${plan.label}`}
      >
        {pill}
      </Link>
    );
  }
  return pill;
}

/** Click-to-open popover listing all plans, with the current one flagged. */
function PlanMenu({
  currentTier,
  pill,
  className,
}: {
  currentTier: PlanTier;
  pill: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex"
        title="Your plan — tap for details"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {pill}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-hair bg-card shadow-card-hover">
            <div className="border-b border-hair px-4 py-3">
              <p className="font-heading font-semibold text-heading">Your plan</p>
              <p className="text-xs text-muted">Each plan unlocks more topic catalogs.</p>
            </div>
            <ul className="p-1.5">
              {PLAN_ROWS.map((row) => {
                const isCurrent = row.tier === currentTier;
                return (
                  <li
                    key={row.tier}
                    className={cn(
                      "rounded-xl px-3 py-2.5",
                      isCurrent && "bg-gold-50 dark:bg-gold-500/10",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-semibold text-heading">{row.label}</span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-navy-900">
                          <Check className="h-3 w-3" /> Current
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      {describe(row.tier, isCurrent)}
                    </p>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-t border-hair px-4 py-3 text-sm font-semibold text-gold-600 transition-colors hover:bg-surface-2"
            >
              View all plans <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
