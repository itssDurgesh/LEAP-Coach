"use client";

import * as React from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Briefcase, GraduationCap, Rocket, type LucideIcon } from "lucide-react";
import { CARD } from "@/components/marketing/SectionHead";
import { ROLES, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const JOURNEYS: { id: Role; label: string; icon: LucideIcon; look: string; ring: string; gap: string }[] = [
  {
    id: "student",
    label: "Students",
    icon: GraduationCap,
    look: "bg-lv-self-tint text-lv-self-dark",
    ring: "ring-lv-self",
    gap: "Schooling is exam-oriented and academic. Even good schools rarely prioritise behavioural and leadership development, the skills that shape a life.",
  },
  {
    id: "professional",
    label: "Professionals",
    icon: Briefcase,
    look: "bg-lv-people-tint text-lv-people-dark",
    ring: "ring-lv-people",
    gap: "Coaching and one-to-one mentoring go to CXOs and hi-potentials. Most professionals fend for themselves.",
  },
  {
    id: "entrepreneur",
    label: "Entrepreneurs",
    icon: Rocket,
    look: "bg-lv-peers-tint text-lv-peers-dark",
    ring: "ring-lv-peers",
    gap: "Founders learn tactics, not character. People, leadership, and culture-building, the things that make ventures last, are seldom taught at all.",
  },
];

/** "Built for three journeys": pick one to see what LEAP builds for it, and why it matters. */
export function JourneyPicker() {
  const [active, setActive] = React.useState<Role>("student");
  const reduce = useReducedMotion();
  const j = JOURNEYS.find((x) => x.id === active)!;
  const role = ROLES.find((r) => r.id === active)!;

  return (
    <div>
      <p className="mt-7 text-sm font-semibold text-heading">Built for three journeys</p>
      <div role="tablist" aria-label="Learning journeys" className="mt-3 grid grid-cols-3 gap-3">
        {JOURNEYS.map((p) => {
          const on = p.id === active;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`journey-tab-${p.id}`}
              aria-selected={on}
              aria-controls="journey-panel"
              onClick={() => setActive(p.id)}
              className={cn(
                "rounded-2xl p-3 text-center ring-offset-2 ring-offset-card transition-all duration-300 ease-out-expo",
                p.look,
                on ? cn("-translate-y-0.5 shadow-v2-soft ring-2", p.ring) : "opacity-75 hover:-translate-y-0.5 hover:opacity-100",
              )}
            >
              <p.icon className="mx-auto h-5 w-5" />
              <span className="mt-1.5 block text-xs font-semibold text-heading">{p.label}</span>
            </button>
          );
        })}
      </div>
      <div className="relative mt-4 min-h-[184px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            id="journey-panel"
            role="tabpanel"
            aria-labelledby={`journey-tab-${active}`}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
            className="rounded-2xl bg-surface p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-v2-gold-text">What you build</p>
            <p className="mt-1 text-sm font-medium text-heading">{role.tagline}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Why it matters</p>
            <p className="mt-1 text-sm leading-6 text-v2-body">{j.gap}</p>
            <Link href="/signup" className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-v2-gold-text">
              Start as {role.label === "Entrepreneur" ? "an" : "a"} {role.label.toLowerCase()}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const RATIOS = [
  { label: "Recommended", value: 250, prefix: "", suffix: " : 1", bar: "bg-lv-orgs" },
  { label: "Average school", value: 500, prefix: "~", suffix: " : 1", bar: "bg-[#E9B93E]" },
  { label: "Public schools", value: 1000, prefix: "", suffix: "+ : 1", bar: "bg-lv-people" },
];

/** Students per counselor, as bars that fill (and numbers that count) when scrolled into view. */
export function CounselorGap() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const shown = inView || !!reduce;

  return (
    <div ref={ref} className={cn(CARD, "grid gap-8 p-7 sm:p-9 lg:grid-cols-[0.9fr_1.1fr] lg:items-center")}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-v2-gold-text">The counseling gap</p>
        <p className="mt-3 font-heading text-display-sm font-bold text-heading">
          Twice the recommended load in an average school, and more than four times in public ones.
        </p>
        <p className="mt-3 text-[15px] leading-6 text-v2-body">
          Students per school counselor. And seeking help is still treated as taboo.
        </p>
      </div>
      <div className="space-y-5">
        {RATIOS.map((r, i) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-heading">{r.label}</span>
              <span className="font-heading text-xl font-bold tabular-nums text-heading">
                <NumberFlow
                  value={shown ? r.value : 0}
                  prefix={r.prefix}
                  suffix={r.suffix}
                  animated={!reduce}
                  format={{ useGrouping: true, maximumFractionDigits: 0 }}
                  locales="en-IN"
                />
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className={cn("h-full rounded-full", r.bar)}
                initial={false}
                animate={{ width: shown ? `${r.value / 10}%` : "0%" }}
                transition={{ duration: reduce ? 0 : 1.1, ease: EASE, delay: reduce ? 0 : 0.15 + i * 0.15 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A decorative circle that drifts as the page scrolls past it (still for reduced motion). */
export function DriftingCircle({ className, distance = 60 }: { className?: string; distance?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : distance]);
  return <motion.span ref={ref} aria-hidden style={{ y }} className={className} />;
}
