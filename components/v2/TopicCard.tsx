"use client";

import Link from "next/link";
import { Check, Star } from "lucide-react";
import { CourseThumb } from "@/components/CourseThumb";
import { LevelChip, v2Button } from "@/components/v2/ui";
import { levelStyle } from "@/lib/levels";
import type { Course, LeadershipTrack } from "@/lib/types";
import { cn, formatDuration, formatINR } from "@/lib/utils";

const TAG = "absolute right-3.5 top-3.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-[18px]";

/**
 * Catalog card for a topic: cover, level, title, length, rating and price.
 * With `owned`, the price and tag are replaced by an "Owned" mark.
 */
export function TopicCard({ course: c, tracks, owned }: { course: Course; tracks: LeadershipTrack[]; owned?: boolean }) {
  const seconds = c.videos.reduce((sum, v) => sum + v.durationSeconds, 0);
  return (
    <Link
      href={`/courses/${c.slug}`}
      className="group flex flex-col overflow-hidden rounded-[24px] bg-card shadow-v2-card transition-all duration-200 ease-out-expo hover:-translate-y-1 hover:shadow-v2-lift"
    >
      <div className="relative">
        <CourseThumb accent={c.accent} category={c.category} title={c.title} src={c.thumbnailUrl} rounded="rounded-none" className="h-[186px] w-full" />
        {owned ? (
          <span className={cn(TAG, "bg-card text-heading")}>
            <Check className={cn("h-3 w-3", levelStyle(c.tracks[0]).text)} strokeWidth={3} /> Owned
          </span>
        ) : c.trending ? (
          <span className={cn(TAG, "bg-[#E9B93E] text-navy-800")}>Trending</span>
        ) : c.ratingCount === 0 ? (
          <span className={cn(TAG, "bg-[#E9B93E] text-navy-800")}>New</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col justify-between p-[18px]">
        <div className="space-y-2 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <LevelChip trackId={c.tracks[0]} tracks={tracks} />
            <span className="text-xs font-medium text-muted">{c.level}</span>
          </div>
          <h3 className="line-clamp-2 font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">{c.title}</h3>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-muted">
            {seconds > 0 && <span>{formatDuration(seconds)}</span>}
            {c.ratingCount > 0 && (
              <span className="inline-flex items-center gap-1">
                · <Star className="h-3 w-3 fill-gold-400 text-gold-600" />
                <span className="font-semibold text-heading">{c.rating.toFixed(1)}</span>
              </span>
            )}
            {c.enrolledCount > 0 && <span>· {c.enrolledCount.toLocaleString("en-IN")} enrolled</span>}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={cn("font-heading text-lg font-bold tracking-[-0.015em]", owned ? "text-muted" : "text-heading")}>
            {owned ? "Owned" : c.price > 0 ? formatINR(c.price) : "Free"}
          </span>
          <span className={v2Button("outline", "sm")}>{owned ? "Open" : "View topic"}</span>
        </div>
      </div>
    </Link>
  );
}
