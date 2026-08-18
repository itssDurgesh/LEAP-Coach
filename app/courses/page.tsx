"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { CourseCard } from "@/components/CourseCard";
import { Input, Select } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { Role, courseCategories } from "@/lib/types";
import { cn } from "@/lib/utils";

const categories: { id: "all" | Role; label: string }[] = [
  { id: "all", label: "All paths" },
  { id: "student", label: "Student" },
  { id: "professional", label: "Professional" },
  { id: "entrepreneur", label: "Entrepreneur" },
];

const durations = [
  { id: "any", label: "Any duration" },
  { id: "short", label: "Under 1.5 hours" },
  { id: "medium", label: "1.5 – 2 hours" },
  { id: "long", label: "Over 2 hours" },
];

export default function CoursesPage() {
  return (
    <AppShell>
      <CatalogContent />
    </AppShell>
  );
}

function CatalogContent() {
  const { currentUser, courses, tracks, isEnrolled } = useApp();
  const role = currentUser?.role ?? "student";

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<"all" | Role>(role);
  const [duration, setDuration] = React.useState("any");
  const [selectedTracks, setSelectedTracks] = React.useState<string[]>([]);

  const toggleTrack = (id: string) =>
    setSelectedTracks((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const published = courses.filter((c) => c.published);
  const trending = published.filter((c) => c.trending);

  const filtered = published.filter((c) => {
    if (category !== "all" && !courseCategories(c).includes(category)) return false;
    if (selectedTracks.length && !selectedTracks.some((t) => c.tracks.includes(t))) return false;
    const dur = c.videos.reduce((s, v) => s + v.durationSeconds, 0) / 3600;
    if (duration === "short" && dur >= 1.5) return false;
    if (duration === "medium" && (dur < 1.5 || dur > 2)) return false;
    if (duration === "long" && dur <= 2) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = (c.title + " " + c.instructorName + " " + c.hashtags.join(" ") + " " + c.description).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const hasFilters = category !== "all" || duration !== "any" || selectedTracks.length > 0 || search.trim();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalog"
        title="Explore coaching topics"
        description="Curated for your path. These programs build authentic, high-performance leadership."
      />

      {/* ── Trending strip ── */}
      {trending.length > 0 && (
        <section>
          <h2 className="mb-5 flex items-center gap-2 font-heading text-xl font-bold text-heading">
            <TrendingUp className="h-5 w-5 text-orange-500" /> Trending now
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trending.slice(0, 3).map((c) => (
              <CourseCard key={c.id} course={c} enrolled={isEnrolled(c.id)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Filters ── */}
      <div className="rounded-3xl border border-hair bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics, instructors, or hashtags…"
              className="pl-10"
            />
          </div>
          <div className="w-full lg:w-52">
            <Select value={duration} onChange={(e) => setDuration(e.target.value)}>
              {durations.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Category pills */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-hair pt-5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "rounded-full px-4 py-1.5 font-heading text-sm font-semibold transition-all duration-200",
                category === cat.id
                  ? "bg-gold-500 text-navy-900"
                  : "bg-surface-2 text-heading hover:bg-gold-100 dark:hover:bg-gold-500/15",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Leadership track chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-heading text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Tracks
          </span>
          {tracks.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTrack(t.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200",
                selectedTracks.includes(t.id)
                  ? "border-gold-500 bg-gold-500 text-navy-900"
                  : "border-hair bg-card text-muted hover:border-gold-400 hover:text-heading",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results ── */}
      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm text-muted">
            <span className="font-heading font-bold tabular-nums text-heading">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "topic" : "topics"}
          </p>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch("");
                setCategory("all");
                setDuration("any");
                setSelectedTracks([]);
              }}
              className="inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-gold-700 transition-colors duration-200 hover:text-gold-600"
            >
              <X className="h-4 w-4" /> Clear filters
            </button>
          )}
        </div>

        {filtered.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CourseCard key={c.id} course={c} enrolled={isEnrolled(c.id)} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-hair bg-card py-20 text-center">
            <p className="font-heading text-lg font-bold text-heading">No topics match your filters</p>
            <p className="mt-1.5 text-sm text-muted">Try widening your search or clearing filters.</p>
          </div>
        )}
      </section>
    </div>
  );
}
