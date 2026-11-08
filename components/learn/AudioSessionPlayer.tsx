"use client";

import * as React from "react";
import Image from "next/image";
import { Headphones } from "lucide-react";
import { usePlaybackResume } from "@/components/learn/usePlaybackResume";
import { canOptimize } from "@/lib/images";
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
 * Behaves like MuxVideoPlayer where it matters to the learner: it starts where
 * they stopped (on this device or another, see usePlaybackResume), reports the
 * real length, and marks the session complete when the recording ends. The page
 * mounts one instance per session (`key`). The topic's video thumbnail, when set,
 * is shown as the recording's artwork.
 */
export function AudioSessionPlayer({ course, video, learnerId, onEnded, onDuration }: AudioSessionPlayerProps) {
  const ref = React.useRef<HTMLAudioElement>(null);
  const { startAt, report, flush, ended } = usePlaybackResume(video.id, learnerId);
  const art = course.videoThumbnailUrl;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-v2-navy p-6 shadow-lift ring-1 ring-white/10 sm:p-8">
      <span aria-hidden className="pointer-events-none absolute -right-[120px] -top-[160px] h-[260px] w-[260px] rounded-full bg-gold-400/20" />
      <div className="relative flex items-center gap-4">
        {art ? (
          <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/15">
            <Image src={art} alt="" fill sizes="96px" unoptimized={!canOptimize(art)} className="object-cover" />
            <span className="absolute inset-0 grid place-items-center bg-navy-950/35 text-white">
              <Headphones className="h-5 w-5" />
            </span>
          </span>
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#E9B93E] text-navy-800">
            <Headphones className="h-6 w-6" />
          </span>
        )}
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
          if (startAt > 0 && (!Number.isFinite(audio.duration) || startAt < audio.duration - 5)) audio.currentTime = startAt;
        }}
        onTimeUpdate={(e) => report(e.currentTarget.currentTime, e.currentTarget.duration)}
        onPause={flush}
        onEnded={() => {
          ended();
          onEnded?.();
        }}
      >
        Your browser cannot play this recording.
      </audio>
    </div>
  );
}
