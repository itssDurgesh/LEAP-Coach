"use client";

import * as React from "react";
import NumberFlow from "@number-flow/react";
import { useInView, useReducedMotion } from "motion/react";
import { Container } from "@/components/marketing/Container";
import { useApp } from "@/lib/store/AppProvider";
import { SiteContent } from "@/lib/types";

/**
 * Admin stat values are free text ("40+", "300K+", "3,500+", "AI"). Pull the leading
 * number out so it can roll, and keep whatever wraps it as literal prefix/suffix.
 * Returns null for values with no number at all, which then render verbatim.
 */
function parseStat(raw: string): { value: number; prefix: string; suffix: string } | null {
  const m = raw.trim().match(/^([^\d]*)([\d,.]+)(.*)$/);
  if (!m) return null;
  const value = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  return { value, prefix: m[1], suffix: m[3] };
}

function StatValue({ raw }: { raw: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const parsed = parseStat(raw);

  if (!parsed) {
    return <span ref={ref}>{raw}</span>;
  }

  return (
    <span ref={ref}>
      <NumberFlow
        value={reduce || inView ? parsed.value : 0}
        prefix={parsed.prefix}
        suffix={parsed.suffix}
        // Plain integer rendering; the admin string already carries any K/+ marker.
        format={{ useGrouping: true, maximumFractionDigits: 0 }}
      />
    </span>
  );
}

export function HomeStats({ initialContent }: { initialContent?: SiteContent | null }) {
  const { siteContent, hydrated } = useApp();
  // Server content pre-hydration (no flash), live store after.
  const stats = ((!hydrated && initialContent) ? initialContent : siteContent).stats;

  if (!stats.length) return null;

  return (
    <section className="border-y border-hair bg-card">
      <Container width="wide">
        <div className="grid grid-cols-2 gap-y-10 py-12 sm:grid-cols-4 sm:py-14">
          {stats.map((s, i) => (
            <div
              key={`${s.label}-${i}`}
              className="border-l border-hair pl-5 sm:pl-7 [&:nth-child(2n+1)]:border-l-0 [&:nth-child(2n+1)]:pl-0 sm:[&:nth-child(2n+1)]:border-l sm:[&:nth-child(2n+1)]:pl-7 sm:[&:nth-child(4n+1)]:border-l-0 sm:[&:nth-child(4n+1)]:pl-0"
            >
              <p className="font-heading text-display-sm font-bold leading-none tracking-tight text-heading tabular-nums">
                <StatValue raw={s.value} />
              </p>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
