"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { TopicCard } from "@/components/v2/TopicCard";
import { PageHead, PillSelect, V2Card, v2Button } from "@/components/v2/ui";
import { levelStyle, shortLevelLabel } from "@/lib/levels";
import { useApp } from "@/lib/store/AppProvider";
import { Role, courseCategories, ownsTopic } from "@/lib/types";
import { cn } from "@/lib/utils";

type Category = "all" | Role;
type Duration = "any" | "short" | "medium" | "long";

const categories: { id: Category; label: string }[] = [
  { id: "all", label: "All paths" },
  { id: "student", label: "Student" },
  { id: "professional", label: "Professional" },
  { id: "entrepreneur", label: "Entrepreneur" },
];

const durations: { id: Duration; label: string }[] = [
  { id: "any", label: "Any duration" },
  { id: "short", label: "Under 1.5 hours" },
  { id: "medium", label: "1.5 – 2 hours" },
  { id: "long", label: "Over 2 hours" },
];

const LEVEL_PILL = "inline-flex items-center gap-2 rounded-full border py-2 text-[13px] font-semibold leading-5 transition-colors duration-200";
const PILL_ON = "border-transparent bg-v2-strong text-v2-on-strong";
const PILL_OFF = "border-hair bg-card text-heading hover:border-v2-line-strong";

export default function CoursesPage() {
  return (
    <AppShell>
      {/* useSearchParams needs a Suspense boundary above it. */}
      <React.Suspense fallback={null}>
        <CatalogContent />
      </React.Suspense>
    </AppShell>
  );
}

function CatalogContent() {
  const { currentUser, courses, tracks, isEnrolled } = useApp();

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<Category>(currentUser?.role ?? "student");
  const [duration, setDuration] = React.useState<Duration>("any");
  // The chosen level lives in the URL (?track=<id>), so the dashboard's level tiles
  // and the browser's back button both land on the right filter.
  const router = useRouter();
  const track = useSearchParams().get("track");
  const setTrack = (id: string | null) =>
    router.replace(id ? `/courses?track=${encodeURIComponent(id)}` : "/courses", { scroll: false });
  if (!currentUser) return null;

  // An id that is not a known level (stale link) behaves like "All levels".
  const level = tracks.some((t) => t.id === track) ? track : null;

  const published = courses.filter((c) => c.published);
  const filtered = published.filter((c) => {
    if (category !== "all" && !courseCategories(c).includes(category)) return false;
    if (level && !c.tracks.includes(level)) return false;
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
  // Topics the learner does not have yet come first.
  const shown = filtered
    .map((course) => ({ course, owned: ownsTopic(currentUser, course, isEnrolled(course.id)) }))
    .sort((a, b) => Number(a.owned) - Number(b.owned));

  const total = published.length;

  return (
    <div className="space-y-7">
      <PageHead
        title="Explore coaching topics"
        description={
          filtered.length === total
            ? `${total} ${total === 1 ? "topic" : "topics"} across ${tracks.length} levels of leading.`
            : `${filtered.length} of ${total} topics shown.`
        }
        actions={
          <label className="flex w-full items-center gap-2.5 rounded-full border border-hair bg-card px-4 py-[11px] transition-colors duration-200 focus-within:border-heading sm:w-[380px]">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics, instructors, hashtags"
              aria-label="Search topics"
              className="min-w-0 flex-1 bg-transparent text-sm leading-5 text-heading placeholder:text-muted focus:outline-none"
            />
          </label>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={!level} onClick={() => setTrack(null)} className={cn(LEVEL_PILL, "px-3.5", level ? PILL_OFF : PILL_ON)}>
            All levels
          </button>
          {tracks.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={level === t.id}
              onClick={() => setTrack(t.id)}
              className={cn(LEVEL_PILL, "px-3", level === t.id ? PILL_ON : PILL_OFF)}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", levelStyle(t.id).base)} />
              {shortLevelLabel(t.label)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PillSelect label="Duration" value={duration} onChange={setDuration} options={durations} />
          <PillSelect label="Path" value={category} onChange={setCategory} options={categories} />
        </div>
      </div>

      {shown.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map(({ course, owned }) => (
            <TopicCard key={course.id} course={course} tracks={tracks} owned={owned} />
          ))}
        </div>
      ) : (
        <V2Card className="px-6 py-16 text-center">
          <p className="font-heading text-lg font-semibold text-heading">No topics match your filters</p>
          <p className="mt-1.5 text-sm text-v2-body">Try a different search, or clear the filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("all");
              setDuration("any");
              setTrack(null);
            }}
            className={v2Button("outline", "sm", "mt-5")}
          >
            Clear filters
          </button>
        </V2Card>
      )}
    </div>
  );
}
