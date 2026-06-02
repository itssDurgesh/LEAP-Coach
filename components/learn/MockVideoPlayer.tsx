"use client";

import * as React from "react";
import Link from "next/link";
import { Play, Pause, Volume2, Maximize, Settings, Check, RotateCcw, ArrowRight } from "lucide-react";
import { ProfessorPhoto } from "@/components/ProfessorPhoto";
import { CourseThumb } from "@/components/CourseThumb";
import { buttonClasses } from "@/components/ui/button-variants";
import { Course, Video } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";

interface MockVideoPlayerProps {
  course: Course;
  video: Video;
  isVishal?: boolean;
  alreadyCompleted?: boolean;
  onEnded?: () => void;
  nextHref?: string | null;
}

export function MockVideoPlayer({
  course,
  video,
  isVishal,
  alreadyCompleted,
  onEnded,
  nextHref,
}: MockVideoPlayerProps) {
  const dur = video.durationSeconds;
  const [t, setT] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [ended, setEnded] = React.useState(false);

  // reset when switching videos
  React.useEffect(() => {
    setT(0);
    setPlaying(false);
    setEnded(false);
  }, [video.id]);

  React.useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setT((prev) => {
        const next = prev + dur / 60; // ~12s to finish at 200ms ticks
        if (next >= dur) {
          window.clearInterval(id);
          setPlaying(false);
          setEnded(true);
          onEnded?.();
          return dur;
        }
        return next;
      });
    }, 200);
    return () => window.clearInterval(id);
  }, [playing, dur, onEnded]);

  const pct = Math.min(100, (t / dur) * 100);

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setT(p * dur);
    if (p >= 0.99) {
      setEnded(true);
      onEnded?.();
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-navy-950 shadow-card">
      <div className="relative aspect-video">
        {isVishal ? (
          <ProfessorPhoto className="absolute inset-0 h-full w-full" rounded="rounded-none" position="top" />
        ) : (
          <CourseThumb
            accent={course.accent}
            category={course.category}
            rounded="rounded-none"
            className="absolute inset-0 h-full w-full"
          />
        )}
        <div className="absolute inset-0 bg-navy-950/40" />

        <div className="absolute left-4 top-4 rounded-lg bg-black/40 px-3 py-1.5 text-sm text-white backdrop-blur">
          <span className="font-semibold">{course.instructorName}</span>
          <span className="text-cream-100/70"> · Video {video.order}</span>
        </div>
        {alreadyCompleted && !ended && (
          <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-green-500/90 px-2.5 py-1 text-xs font-semibold text-white">
            <Check className="h-3.5 w-3.5" /> Completed
          </div>
        )}

        {ended ? (
          <div className="absolute inset-0 grid place-items-center bg-navy-950/75 text-center">
            <div>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-500 text-white">
                <Check className="h-7 w-7" strokeWidth={3} />
              </div>
              <p className="mt-3 font-heading text-lg font-bold text-white">Lesson complete!</p>
              <div className="mt-4 flex justify-center gap-2.5">
                <button
                  onClick={() => {
                    setT(0);
                    setEnded(false);
                  }}
                  className={buttonClasses({
                    variant: "outline",
                    size: "sm",
                    className: "border-white/30 bg-transparent text-white hover:bg-white/10",
                  })}
                >
                  <RotateCcw className="h-4 w-4" /> Rewatch
                </button>
                {nextHref && (
                  <Link href={nextHref} className={buttonClasses({ variant: "primary", size: "sm" })}>
                    Next session <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setPlaying((p) => !p)}
            className="group absolute inset-0 grid place-items-center"
            aria-label={playing ? "Pause" : "Play"}
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-gold-500/95 text-navy-900 shadow-gold transition-transform group-hover:scale-105">
              {playing ? <Pause className="h-7 w-7 fill-navy-900" /> : <Play className="ml-1 h-7 w-7 fill-navy-900" />}
            </span>
          </button>
        )}
      </div>

      {/* Control bar */}
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <button onClick={() => setPlaying((p) => !p)} className="hover:text-gold-400" aria-label="Play/Pause">
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <span className="text-xs tabular-nums text-cream-100/80">{formatClock(t)}</span>
        <div onClick={seek} className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/20">
          <div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400 shadow"
            style={{ left: `${pct}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-cream-100/80">{formatClock(dur)}</span>
        <Volume2 className="h-5 w-5 text-cream-100/70" />
        <Settings className="h-5 w-5 text-cream-100/70" />
        <Maximize className="h-5 w-5 text-cream-100/70" />
      </div>
    </div>
  );
}
