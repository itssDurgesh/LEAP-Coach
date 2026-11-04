"use client";

import * as React from "react";
import { Headphones } from "lucide-react";
import { Course, Video } from "@/lib/types";
import { placeKey, readPlace, resumable, startingPlace, writePlace } from "@/lib/watch-position";

interface AudioSessionPlayerProps {
  course: Course;
  video: Video;
  /** Whose place to remember, so two learners on one browser do not share it. */
  learnerId?: string;
  /** The place saved in the database (from any of the learner's devices), and when (ms). */
  resumeSeconds?: number;
  resumeSavedAt?: number;
  onEnded?: () => void;
  /** Reports the recording's real length once the browser knows it. */
  onDuration?: (seconds: number) => void;
  /** The place to remember (0 = from the start): on play, pause, leaving, and every 30 s of playback. */
  onPosition?: (seconds: number) => void;
}

const REPORT_EVERY_MS = 30_000;

/**
 * A session the admin uploaded as an audio recording instead of a video.
 *
 * Behaves like MuxVideoPlayer where it matters to the learner: it starts where they
 * stopped, on this or another device (the newer of this browser's place and the
 * database's), reports the real length, and marks the session complete when the
 * recording ends. The page mounts one instance per session (`key`).
 */
export const AudioSessionPlayer = React.memo(function AudioSessionPlayer({
  course,
  video,
  learnerId,
  resumeSeconds,
  resumeSavedAt,
  onEnded,
  onDuration,
  onPosition,
}: AudioSessionPlayerProps) {
  const ref = React.useRef<HTMLAudioElement>(null);
  const key = placeKey(learnerId, video.id);
  const played = React.useRef(false);
  const lastTime = React.useRef(0);
  const lastWritten = React.useRef(0);
  const lastReport = React.useRef(0);
  const report = React.useRef(onPosition);
  report.current = onPosition;
  // The database's copy, read when the recording's length is known (see onLoadedMetadata).
  const remote = React.useRef<{ seconds: number; at: number } | null>(null);
  remote.current = resumeSeconds != null ? { seconds: resumeSeconds, at: resumeSavedAt ?? 0 } : null;
  const chosenAt = React.useRef(0);

  const place = (time: number) => (resumable(time, ref.current?.duration ?? NaN) ? time : 0);

  function savePosition(force: boolean) {
    const audio = ref.current;
    if (!audio) return;
    const time = audio.currentTime;
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

  // Leaving the lesson saves the exact place (see MuxVideoPlayer).
  React.useEffect(() => {
    const flush = () => {
      if (!played.current) return;
      const seconds = resumable(lastTime.current, NaN) ? lastTime.current : 0;
      writePlace(key, seconds);
      report.current?.(seconds);
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
  }, [key]);

  // A newer place from another device that arrives after the recording loaded, before play.
  React.useEffect(() => {
    const audio = ref.current;
    if (!audio || played.current || audio.readyState < 1 || resumeSeconds == null || !resumeSavedAt || resumeSavedAt <= chosenAt.current) return;
    chosenAt.current = resumeSavedAt;
    if (resumable(resumeSeconds, audio.duration)) audio.currentTime = resumeSeconds;
  }, [resumeSeconds, resumeSavedAt]);

  const art = course.videoThumbnailUrl;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-v2-navy p-6 shadow-lift ring-1 ring-white/10 sm:p-8">
      {/* The topic's thumbnail as artwork, faded behind the controls. */}
      {art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />
      )}
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
          const local = readPlace(key);
          const seconds = startingPlace(local, remote.current);
          chosenAt.current = Math.max(local?.at ?? 0, remote.current?.at ?? 0);
          if (resumable(seconds, audio.duration)) {
            audio.currentTime = seconds;
            lastTime.current = seconds;
            lastWritten.current = seconds;
          }
        }}
        onPlay={() => {
          played.current = true;
          savePosition(true);
        }}
        onTimeUpdate={() => savePosition(false)}
        onPause={() => savePosition(true)}
        onEnded={() => {
          played.current = false;
          writePlace(key, 0);
          onEnded?.();
        }}
      >
        Your browser cannot play this recording.
      </audio>
    </div>
  );
});
