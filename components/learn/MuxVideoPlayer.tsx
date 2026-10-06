"use client";

import * as React from "react";
import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
import { Course, Video } from "@/lib/types";

interface MuxVideoPlayerProps {
  course: Course;
  video: Video;
  /** Whose place to remember, so two learners on one browser do not share it. */
  learnerId?: string;
  onEnded?: () => void;
  /** Reports the clip's real length once the player knows it. */
  onDuration?: (seconds: number) => void;
}

function readPosition(key: string) {
  try {
    const seconds = Number(localStorage.getItem(key));
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  } catch {
    return 0; // storage blocked: start from the beginning
  }
}

/**
 * Real Mux playback. Used when a video has a genuine Mux playback id
 * (the player page falls back to MockVideoPlayer for placeholder ids).
 *
 * Remembers where the learner stopped (in this browser) and starts there next
 * time, which is what "Resume video" promises. The page mounts one instance per
 * video (`key`), so the saved place is read once, on mount.
 */
export function MuxVideoPlayer({ course, video, learnerId, onEnded, onDuration }: MuxVideoPlayerProps) {
  const ref = React.useRef<MuxPlayerRefAttributes>(null);
  const key = `leap-video-pos:${learnerId ?? "anon"}:${video.id}`;
  const [startTime] = React.useState(() => readPosition(key));
  const lastSaved = React.useRef(startTime);

  function savePosition(force: boolean) {
    const player = ref.current;
    if (!player) return;
    const time = player.currentTime;
    if (!force && Math.abs(time - lastSaved.current) < 5) return;
    lastSaved.current = time;
    try {
      // Nothing worth resuming in the opening seconds or the closing ones.
      const nearEnd = Number.isFinite(player.duration) && time > player.duration - 5;
      if (time < 5 || nearEnd) localStorage.removeItem(key);
      else localStorage.setItem(key, String(Math.floor(time)));
    } catch {
      /* storage blocked or full: resuming is a convenience, not a requirement */
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-navy-950 shadow-lift ring-1 ring-white/10">
      {/* No `--media-object-fit: cover` here: it filled the box by cropping, so in
          fullscreen on any screen that is not 16:9 the edges of the picture were cut off. */}
      <MuxPlayer
        ref={ref}
        playbackId={video.muxPlaybackId}
        streamType="on-demand"
        accentColor="#E0B43C"
        title={video.title}
        startTime={startTime || undefined}
        metadata={{
          video_id: video.id,
          video_title: video.title,
          video_series: course.title,
        }}
        onTimeUpdate={() => savePosition(false)}
        onPause={() => savePosition(true)}
        onDurationChange={() => {
          const seconds = ref.current?.duration;
          if (seconds && Number.isFinite(seconds)) onDuration?.(seconds);
        }}
        onEnded={() => {
          try {
            localStorage.removeItem(key);
          } catch {
            /* see savePosition */
          }
          onEnded?.();
        }}
        className="aspect-video w-full"
      />
    </div>
  );
}
