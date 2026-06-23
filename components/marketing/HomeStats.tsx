"use client";

import { Users, BookOpen, Route, Sparkles, LucideIcon } from "lucide-react";
import { useApp } from "@/lib/store/AppProvider";
import { SiteContent } from "@/lib/types";

const icons: LucideIcon[] = [Users, BookOpen, Route, Sparkles];

export function HomeStats({ initialContent }: { initialContent?: SiteContent | null }) {
  const { siteContent, hydrated } = useApp();
  // Server content pre-hydration (no flash), live store after.
  const stats = ((!hydrated && initialContent) ? initialContent : siteContent).stats;

  return (
    <section className="border-y border-hair bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-9 sm:px-8 md:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = icons[i % icons.length];
          return (
            <div key={`${s.label}-${i}`} className="flex items-center gap-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-gold-600">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-heading text-2xl font-bold text-heading">{s.value}</p>
                <p className="text-sm text-muted">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
