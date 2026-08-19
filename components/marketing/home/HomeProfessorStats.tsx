"use client";

import { Container } from "@/components/marketing/Container";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { useApp } from "@/lib/store/AppProvider";

/** The admin-editable achievement grid in the "Meet your mentor" section. */
export function HomeProfessorStats() {
  const { siteContent } = useApp();
  const stats = siteContent.professorStats;
  if (!stats.length) return null;

  return (
    <Stagger
      className="mt-16 grid grid-cols-2 border-l border-t border-hair sm:grid-cols-3 lg:grid-cols-6"
      gap={0.06}
    >
      {stats.map((s, i) => (
        <StaggerItem key={`${s.label}-${i}`} className="border-b border-r border-hair p-5 sm:p-6">
          <p className="font-heading text-2xl font-bold leading-none text-heading tabular-nums">
            {s.value}
          </p>
          <p className="mt-2.5 text-[11px] uppercase leading-snug tracking-[0.1em] text-faint">
            {s.label}
          </p>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
