"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { levelStyle, trackLabel } from "@/lib/levels";
import type { LeadershipTrack } from "@/lib/types";
import { cn } from "@/lib/utils";

/* Shared building blocks of the version 2 learner theme. */

/** Pass as `className` to `Avatar`: initials on the dark brand colour instead of pale blue. */
export const V2_AVATAR = "bg-v2-strong font-sans font-bold text-v2-on-strong";

export function V2Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[24px] bg-card shadow-v2-card", className)} {...rest} />;
}

/** Page title with a one-line description and optional actions on the right. */
export function PageHead({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-heading text-[32px] font-bold leading-[38px] tracking-[-0.015em] text-heading">{title}</h1>
        {description && <p className="mt-1.5 text-base leading-6 text-v2-body">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export { v2Button } from "@/components/v2/button";

/** Small coloured tag naming a leadership level. Renders nothing for an unknown track. */
export function LevelChip({ trackId, tracks, className }: { trackId?: string | null; tracks: LeadershipTrack[]; className?: string }) {
  const label = trackLabel(tracks, trackId);
  if (!label) return null;
  const s = levelStyle(trackId);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", s.tint, s.text, className)}>
      <s.icon className="h-3.5 w-3.5" strokeWidth={2.2} /> {label}
    </span>
  );
}

/** Rounded progress bar. With `animate`, the fill grows from empty once on mount. */
export function Bar({ pct, fillClass = "bg-gold-400", trackClass = "bg-surface-2", className, animate }: { pct: number; fillClass?: string; trackClass?: string; className?: string; animate?: boolean }) {
  const [shown, setShown] = React.useState(animate ? 0 : pct);
  React.useEffect(() => {
    if (!animate) {
      setShown(pct);
      return;
    }
    const t = setTimeout(() => setShown(pct), 450);
    return () => clearTimeout(t);
  }, [pct, animate]);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.max(0, Math.min(100, pct)))}
      className={cn("h-2 overflow-hidden rounded-full", trackClass, className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out-expo", fillClass)}
        style={{ width: `${Math.max(0, Math.min(100, shown))}%` }}
      />
    </div>
  );
}

/** Pill-shaped switcher between views. Each pill is a toggle button; the active one is pressed. */
export function SegTabs<T extends string>({ tabs, value, onChange, fill, className }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void; fill?: boolean; className?: string }) {
  return (
    <div role="group" className={cn("inline-flex gap-1 rounded-full bg-v2-segment p-1", fill && "flex w-full", className)}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(t.id)}
            className={cn(
              "rounded-full px-[18px] py-[7px] text-[13px] leading-5 transition-colors duration-200",
              fill && "flex-1 px-2",
              on ? "bg-v2-raised font-semibold text-heading shadow-[0_1px_3px_rgba(12,27,54,0.10)]" : "font-medium text-muted hover:text-heading",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Native select styled as a pill, for sort and filter menus. */
export function PillSelect<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (id: T) => void; options: { id: T; label: string }[] }) {
  return (
    <label className="relative inline-block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer appearance-none rounded-full border border-hair bg-card py-2 pl-3.5 pr-9 text-[13px] font-semibold leading-5 text-heading transition-colors duration-200 hover:border-v2-line-strong"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-heading" />
    </label>
  );
}

/**
 * Entrance animation used on the dashboard after sign-in. Children rise and fade
 * in when `IntroContext` is true; otherwise (and for reduced-motion users) they
 * render as a plain div with no animation.
 */
export const IntroContext = React.createContext(false);

export function Rise({ delay = 0, className, children }: { delay?: number; className?: string; children: React.ReactNode }) {
  const intro = React.useContext(IntroContext);
  const reduce = useReducedMotion();
  if (!intro || reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
