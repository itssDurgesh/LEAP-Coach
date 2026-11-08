"use client";

import * as React from "react";
import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
import { Course, Video } from "@/lib/types";
import { placeKey, readPlace, resumable, startingPlace, writePlace } from "@/lib/watch-position";

interface MuxVideoPlayerProps {
  course: Course;
  video: Video;
  /** Whose place to remember, so two learners on one browser do not share it. */
  learnerId?: string;
  /** The place saved in the database (from any of the learner's devices), and when (ms). */
  resumeSeconds?: number;
  resumeSavedAt?: number;
  onEnded?: () => void;
  /** Reports the clip's real length once the player knows it. */
  onDuration?: (seconds: number) => void;
  /** The place to remember (0 = from the start): on play, pause, leaving, and every 30 s of playback. */
  onPosition?: (seconds: number) => void;
}

const REPORT_EVERY_MS = 30_000;

/**
 * Real Mux playback. Used when a video has a genuine Mux playback id
 * (the player page falls back to MockVideoPlayer for placeholder ids).
 *
 * Starts where the learner stopped, on this or another device: this browser keeps
 * the place as it plays, the database gets it on pause, on leaving the page and
 * every half minute, and the newer of the two wins. The page mounts one instance per
 * video (`key`), so the starting place is chosen once, on mount.
 *
 * Memoized: the lesson page re-renders on store changes and tab switches, and the
 * player (a heavy web component) has nothing to update unless its own props change.
 */
export const MuxVideoPlayer = React.memo(function MuxVideoPlayer({
  course,
  video,
  learnerId,
  resumeSeconds,
  resumeSavedAt,
  onEnded,
  onDuration,
  onPosition,
}: MuxVideoPlayerProps) {
  const ref = React.useRef<MuxPlayerRefAttributes>(null);
  const key = placeKey(learnerId, video.id);
  const [start] = React.useState(() => {
    const local = readPlace(key);
    const remote = resumeSeconds != null ? { seconds: resumeSeconds, at: resumeSavedAt ?? 0 } : null;
    return { seconds: startingPlace(local, remote), at: Math.max(local?.at ?? 0, remote?.at ?? 0) };
  });
  const [startTime, setStartTime] = React.useState(start.seconds);
  const chosenAt = React.useRef(start.at);
  const played = React.useRef(false);
  const lastTime = React.useRef(start.seconds);
  const lastWritten = React.useRef(start.seconds);
  const lastReport = React.useRef(0);
  const length = React.useRef(NaN);
  const report = React.useRef(onPosition);
  report.current = onPosition;

  const place = (time: number) => (resumable(time, length.current) ? time : 0);

  function savePosition(force: boolean) {
    const player = ref.current;
    if (!player) return;
    const time = player.currentTime;
    lastTime.current = time;
    if (force || Math.abs(time - lastWritten.current) >= 5) {
      lastWritten.current = time;
      writePlace(key, place(time));
    }
    const now = Date.now();
    if (force || now - lastReport.current >= REPORT_EVERY_MS) {
      lastReport.current = now;
      report.current?.(place(time));
    }
  }

  // Leaving the lesson (another page, closing the tab, switching apps on a phone)
  // saves the exact place, so switching back picks up there and not up to 30 s earlier.
  React.useEffect(() => {
    const flush = () => {
      if (!played.current) return;
      writePlace(key, place(lastTime.current));
      report.current?.(place(lastTime.current));
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // A newer place can arrive just after the page opened from its cached copy (the
  // learner watched on another device since). Until they press play, move to it.
  React.useEffect(() => {
    if (played.current || resumeSeconds == null || !resumeSavedAt || resumeSavedAt <= chosenAt.current) return;
    chosenAt.current = resumeSavedAt;
    const seconds = resumeSeconds > 0 ? resumeSeconds : 0;
    setStartTime(seconds);
    const player = ref.current;
    if (player && player.readyState >= 1) player.currentTime = seconds;
  }, [resumeSeconds, resumeSavedAt]);

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
        // The topic's own thumbnail when the admin set one; Mux's frame otherwise.
        poster={course.videoThumbnailUrl || undefined}
        startTime={startTime || undefined}
        metadata={{
          video_id: video.id,
          video_title: video.title,
          video_series: course.title,
        }}
        onPlay={() => {
          played.current = true;
          savePosition(true);
        }}
        onTimeUpdate={() => savePosition(false)}
        onPause={() => savePosition(true)}
        onDurationChange={() => {
          const seconds = ref.current?.duration;
          if (seconds && Number.isFinite(seconds)) {
            length.current = seconds;
            onDuration?.(seconds);
          }
        }}
        onEnded={() => {
          // Finished: the store resets the place (markVideoComplete), nothing to flush.
          played.current = false;
          writePlace(key, 0);
          onEnded?.();
        }}
        className="aspect-video w-full"
      />
    </div>
  );
});
