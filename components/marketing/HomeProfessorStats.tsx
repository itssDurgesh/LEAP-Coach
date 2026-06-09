"use client";

import { useApp } from "@/lib/store/AppProvider";
import { DEFAULT_SITE_CONTENT } from "@/lib/types";

/** The admin-editable achievement grid in the "Meet your mentor" section. */
export function HomeProfessorStats() {
  const { siteContent } = useApp();
  const stats = siteContent?.professorStats?.length
    ? siteContent.professorStats
    : DEFAULT_SITE_CONTENT.professorStats;

  return (
    <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((s, i) => (
        <div key={`${s.label}-${i}`} className="rounded-2xl border border-hair bg-surface p-4 text-center">
          <p className="font-heading text-2xl font-bold text-heading">{s.value}</p>
          <p className="mt-0.5 text-xs text-muted">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
