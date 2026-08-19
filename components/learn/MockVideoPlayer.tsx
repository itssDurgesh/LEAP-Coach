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
    <div className="overflow-hidden rounded-3xl bg-navy-950 shadow-lift ring-1 ring-white/10">
      <div className="group/stage relative aspect-video">
        {isVishal ? (
          <ProfessorPhoto
            className="absolute inset-0 h-full w-full"
            rounded="rounded-none"
            position="top"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        ) : (
          <CourseThumb
            accent={course.accent}
            category={course.category}
            rounded="rounded-none"
            className="absolute inset-0 h-full w-full"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/25 to-navy-950/40" />

        <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1.5 text-xs backdrop-blur-md">
          <span className="font-heading font-semibold text-white">{course.instructorName}</span>
          <span className="text-cream-100/60"> · Video {video.order}</span>
        </div>
        {alreadyCompleted && !ended && (
          <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-green-500/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Completed
          </div>
        )}

        {ended ? (
          <div className="absolute inset-0 grid place-items-center bg-navy-950/80 text-center backdrop-blur-sm">
            <div>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-500 text-white">
                <Check className="h-7 w-7" strokeWidth={3} />
              </div>
              <p className="mt-4 font-heading text-lg font-bold text-white">Lesson complete</p>
              <div className="mt-5 flex justify-center gap-2.5">
                <button
                  onClick={() => {
                    setT(0);
                    setEnded(false);
                  }}
                  className={buttonClasses({
                    variant: "outline",
                    size: "sm",
                    className: "border-white/25 bg-transparent text-white hover:border-white/40 hover:bg-white/10",
                  })}
                >
                  <RotateCcw className="h-4 w-4" /> Rewatch
                </button>
                {nextHref && (
                  <Link
                    href={nextHref}
                    className={buttonClasses({ variant: "primary", size: "sm", className: "group" })}
                  >
                    Next session
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
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
            <span
              className={cn(
                "grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-gold-500 text-navy-900 shadow-gold transition-all duration-300 ease-out-expo group-hover:scale-110 group-hover:bg-gold-400",
                playing && "scale-90 opacity-0 group-hover/stage:scale-100 group-hover/stage:opacity-100",
              )}
            >
              {playing ? (
                <Pause className="h-7 w-7 fill-navy-900" />
              ) : (
                <Play className="ml-1 h-7 w-7 fill-navy-900" />
              )}
            </span>
          </button>
        )}
      </div>

      {/* Control bar */}
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3.5 text-white">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="transition-colors duration-200 hover:text-gold-400"
          aria-label="Play/Pause"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <span className="text-xs tabular-nums text-cream-100/75">{formatClock(t)}</span>

        {/* Track grows on hover, so the hit area stays generous without a fat bar. */}
        <div onClick={seek} className="group/track relative flex-1 cursor-pointer py-2">
          <div className="relative h-1 rounded-full bg-white/20 transition-all duration-200 group-hover/track:h-1.5">
            <div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400 opacity-0 shadow transition-opacity duration-200 group-hover/track:opacity-100"
              style={{ left: `${pct}%` }}
            />
          </div>
        </div>

        <span className="text-xs tabular-nums text-cream-100/75">{formatClock(dur)}</span>
        <Volume2 className="h-5 w-5 text-cream-100/60 transition-colors duration-200 hover:text-white" />
        <Settings className="hidden h-5 w-5 text-cream-100/60 transition-colors duration-200 hover:text-white sm:block" />
        <Maximize className="h-5 w-5 text-cream-100/60 transition-colors duration-200 hover:text-white" />
      </div>
    </div>
  );
}
