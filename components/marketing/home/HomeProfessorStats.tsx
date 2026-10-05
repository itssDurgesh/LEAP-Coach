"use client";

import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { useApp } from "@/lib/store/AppProvider";

/** The admin-editable achievement grid in the "Meet your mentor" section. */
export function HomeProfessorStats() {
  const { siteContent } = useApp();
  const stats = siteContent.professorStats;
  if (!stats.length) return null;

  return (
    <Stagger
      className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 rounded-[24px] bg-card p-7 shadow-v2-card sm:grid-cols-3 sm:p-9 lg:grid-cols-6"
      gap={0.06}
    >
      {stats.map((s, i) => (
        <StaggerItem key={`${s.label}-${i}`}>
          <p className="font-heading text-[28px] font-bold leading-none tracking-[-0.015em] text-heading tabular-nums">
            {s.value}
          </p>
          <p className="mt-2 text-[13px] font-medium leading-snug text-muted">{s.label}</p>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
