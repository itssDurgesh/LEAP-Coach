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
    // Padded like a rolling number (which adds an eighth of an em above and below),
    // so a word such as "AI" sits on the same line as the numbers beside it.
    return (
      <span ref={ref} className="inline-block py-[0.125em]">
        {raw}
      </span>
    );
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
    <section className="py-8 sm:py-10">
      <Container width="wide">
        <div className="relative overflow-hidden rounded-[28px] bg-v2-navy px-7 py-10 shadow-v2-card sm:px-12 sm:py-12">
          <span aria-hidden className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-gold-400/15" />
          <div className="relative grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div key={`${s.label}-${i}`}>
                <p className="font-heading text-[clamp(2rem,1.4rem+2vw,3rem)] font-bold leading-none tracking-[-0.02em] text-white tabular-nums">
                  <StatValue raw={s.value} />
                </p>
                <p className="mt-2.5 text-sm font-medium text-v2-on-navy-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
