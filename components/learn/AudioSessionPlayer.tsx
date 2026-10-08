"use client";

import * as React from "react";
import { Headphones } from "lucide-react";
import { Course, Video } from "@/lib/types";

interface AudioSessionPlayerProps {
  course: Course;
  video: Video;
  /** Whose place to remember, so two learners on one browser do not share it. */
  learnerId?: string;
  onEnded?: () => void;
  /** Reports the recording's real length once the browser knows it. */
  onDuration?: (seconds: number) => void;
}

/**
 * A session the admin uploaded as an audio recording instead of a video.
 *
 * Behaves like MuxVideoPlayer where it matters to the learner: it remembers where
 * they stopped (same localStorage key, this browser only), reports the real length,
 * and marks the session complete when the recording ends. The page mounts one
 * instance per session (`key`).
 */
export function AudioSessionPlayer({ course, video, learnerId, onEnded, onDuration }: AudioSessionPlayerProps) {
  const ref = React.useRef<HTMLAudioElement>(null);
  const key = `leap-video-pos:${learnerId ?? "anon"}:${video.id}`;
  const lastSaved = React.useRef(0);

  function savePosition(force: boolean) {
    const audio = ref.current;
    if (!audio) return;
    const time = audio.currentTime;
    if (!force && Math.abs(time - lastSaved.current) < 5) return;
    lastSaved.current = time;
    try {
      // Nothing worth resuming in the opening seconds or the closing ones.
      const nearEnd = Number.isFinite(audio.duration) && time > audio.duration - 5;
      if (time < 5 || nearEnd) localStorage.removeItem(key);
      else localStorage.setItem(key, String(Math.floor(time)));
    } catch {
      /* storage blocked or full: resuming is a convenience, not a requirement */
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-v2-navy p-6 shadow-lift ring-1 ring-white/10 sm:p-8">
      <span aria-hidden className="pointer-events-none absolute -right-[120px] -top-[160px] h-[260px] w-[260px] rounded-full bg-gold-400/20" />
      <div className="relative flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#E9B93E] text-navy-800">
          <Headphones className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-5 text-v2-on-navy-muted">Audio session · {course.title}</p>
          <p className="font-heading text-xl font-semibold leading-[26px] tracking-[-0.01em] text-white">{video.title}</p>
        </div>
      </div>
      <audio
        ref={ref}
        controls
        preload="metadata"
        src={video.audioUrl ?? undefined}
        className="relative mt-6 w-full"
        onLoadedMetadata={(e) => {
          const audio = e.currentTarget;
          if (Number.isFinite(audio.duration)) onDuration?.(audio.duration);
          try {
            const seconds = Number(localStorage.getItem(key));
            if (Number.isFinite(seconds) && seconds > 0 && seconds < audio.duration - 5) {
              audio.currentTime = seconds;
              lastSaved.current = seconds;
            }
          } catch {
            /* storage blocked: start from the beginning */
          }
        }}
        onTimeUpdate={() => savePosition(false)}
        onPause={() => savePosition(true)}
        onEnded={() => {
          try {
            localStorage.removeItem(key);
          } catch {
            /* see savePosition */
          }
          onEnded?.();
        }}
      >
        Your browser cannot play this recording.
      </audio>
    </div>
  );
}
