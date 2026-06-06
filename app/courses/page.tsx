"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { useApp } from "@/lib/store/AppProvider";
import { Role } from "@/lib/types";
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
    if (category !== "all" && c.category !== category) return false;
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
    <div className="space-y-7">
      <div>
        <h1 className="font-heading text-3xl font-bold text-heading">Explore Coaching Topics</h1>
        <p className="mt-1.5 text-muted">
          Curated for your path — discover programs that build authentic, high-performance leadership.
        </p>
      </div>

      {/* Trending strip */}
      {trending.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-heading">
            <TrendingUp className="h-5 w-5 text-orange-500" /> Trending now
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trending.slice(0, 3).map((c) => (
              <CourseCard key={c.id} course={c} enrolled={isEnrolled(c.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-hair bg-card p-4 shadow-card sm:p-5">
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
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                category === cat.id
                  ? "bg-navy-800 text-white"
                  : "bg-surface-2 text-heading hover:bg-surface-2",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Leadership track chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Tracks
          </span>
          {tracks.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTrack(t.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selectedTracks.includes(t.id)
                  ? "border-gold-300 bg-gold-50 text-gold-700"
                  : "border-hair bg-card text-muted hover:border-navy-200",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted">
            <span className="font-semibold text-heading">{filtered.length}</span>{" "}
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
              className="inline-flex items-center gap-1 text-sm font-medium text-gold-600 hover:text-gold-700"
            >
              <X className="h-4 w-4" /> Clear filters
            </button>
          )}
        </div>

        {filtered.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CourseCard key={c.id} course={c} enrolled={isEnrolled(c.id)} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-hair bg-card py-16 text-center">
            <p className="font-heading text-lg font-semibold text-heading">No topics match your filters</p>
            <p className="mt-1 text-sm text-muted">Try widening your search or clearing filters.</p>
          </div>
        )}
      </section>
    </div>
  );
}
