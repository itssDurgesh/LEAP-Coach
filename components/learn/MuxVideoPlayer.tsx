"use client";

import * as React from "react";
import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
import { Loader2, Lock } from "lucide-react";
import { Course, Video } from "@/lib/types";
import { loadPlayback, type PlaybackGrant } from "@/lib/playback";
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

// Mux's codes for a refusal that a fresh answer from /api/leap/playback can fix:
// a token that expired, is missing or does not fit the id; a token sent with an id
// that is public (400); an id that no longer exists because the admin replaced it
// (404); and Mux's "unknown" network error, which is also what a token refused for
// a reason the player cannot see (a device clock hours slow) turns into.
const RECOVERABLE = new Set([2000000, 2400000, 2404000, 2403201, 2403210, 2403221, 2403222, 2403232, 2412202]);
// After this many fresh starts within the window, Mux's own message stays up.
const MAX_RECOVERIES = 2;
const RECOVERY_WINDOW_MS = 5 * 60_000;

/** The box the video fills, for the moments before it can play (same size, no jump). */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-navy-950 shadow-lift ring-1 ring-white/10">
      <div className="grid aspect-video w-full place-items-center p-6 text-center">{children}</div>
    </div>
  );
}

/**
 * Real Mux playback. Used when a video has a genuine Mux playback id
 * (the player page falls back to MockVideoPlayer for placeholder ids).
 *
 * Starts where the learner stopped, on this or another device: this browser keeps
 * the place as it plays, the database gets it on pause, on leaving the page and
 * every half minute, and the newer of the two wins. The page mounts one instance per
 * video (`key`), so the starting place is chosen once, on mount.
 *
 * Signed playback: the playback id and its tokens come from /api/leap/playback,
 * which checks the learner may open the topic (lib/playback.ts). Tokens expire, so
 * when Mux refuses one (a tab left open for a day, an id the admin replaced) the
 * player asks again and starts afresh where the learner was, playing on if it was
 * playing.
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
  const playing = React.useRef(false);
  const recoveries = React.useRef<number[]>([]);

  // What to play: the id and, when it is signed, its tokens. `attempt` counts fresh
  // starts after a refusal; each one asks the server again and remounts the player.
  const [grant, setGrant] = React.useState<PlaybackGrant | null>(null);
  const [denied, setDenied] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const [playOnStart, setPlayOnStart] = React.useState(false);
  React.useEffect(() => {
    let live = true;
    void loadPlayback({ id: video.id, muxPlaybackId: video.muxPlaybackId }, learnerId, { retry: attempt > 0 }).then((r) => {
      if (!live) return;
      setGrant(r.ok ? r.grant : null);
      setDenied(r.ok ? null : r.error);
    });
    return () => {
      live = false;
    };
  }, [video.id, video.muxPlaybackId, learnerId, attempt]);

  function onError(event: Event) {
    // Mux puts its MediaError (with `muxCode`) on the event, and on the inner media element.
    const detail = (event as CustomEvent).detail;
    const err = (detail && typeof detail === "object" ? detail : (ref.current as unknown as { media?: { error?: unknown } } | null)?.media?.error) as
      | { muxCode?: number; errorCategory?: string }
      | null
      | undefined;
    if (!err || !RECOVERABLE.has(err.muxCode ?? 0)) return;
    // A poster or timeline-preview image failing does not stop the video.
    if (err.errorCategory && err.errorCategory !== "video") return;
    const now = Date.now();
    recoveries.current = recoveries.current.filter((t) => now - t < RECOVERY_WINDOW_MS);
    if (recoveries.current.length >= MAX_RECOVERIES) return;
    recoveries.current.push(now);
    if (lastTime.current > 0) setStartTime(lastTime.current);
    setPlayOnStart(playing.current);
    setGrant(null);
    setAttempt((n) => n + 1);
  }

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

  if (denied) {
    return (
      <Frame>
        <div className="max-w-sm space-y-2 text-white/80">
          <Lock className="mx-auto h-6 w-6 text-white/60" />
          <p className="text-sm">{denied}</p>
        </div>
      </Frame>
    );
  }
  if (!grant) {
    return (
      <Frame>
        <Loader2 className="h-7 w-7 animate-spin text-white/60" />
      </Frame>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-navy-950 shadow-lift ring-1 ring-white/10">
      {/* No `--media-object-fit: cover` here: it filled the box by cropping, so in
          fullscreen on any screen that is not 16:9 the edges of the picture were cut off. */}
      <MuxPlayer
        key={attempt}
        ref={ref}
        playbackId={grant.playbackId}
        tokens={grant.tokens}
        autoPlay={attempt > 0 && playOnStart ? true : undefined}
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
          playing.current = true;
          savePosition(true);
        }}
        onTimeUpdate={() => savePosition(false)}
        onPause={() => {
          playing.current = false;
          savePosition(true);
        }}
        onError={onError}
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
          playing.current = false;
          writePlace(key, 0);
          onEnded?.();
        }}
        className="aspect-video w-full"
      />
    </div>
  );
});
