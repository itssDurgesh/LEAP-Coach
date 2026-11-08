"use client";

import * as React from "react";
import { useApp } from "@/lib/store/AppProvider";

const LOCAL_PREFIX = "leap-video-pos:";
/** Seconds of playback between saves of this browser's copy (cheap). */
const LOCAL_EVERY_S = 5;
/** Milliseconds between saves to the database while the video plays. */
const DB_EVERY_MS = 20_000;
/** Nothing worth resuming in the opening or closing seconds. */
const EDGE_S = 5;

interface LocalPosition {
  /** Seconds into the video. */
  t: number;
  /** When it was saved (ms); 0 for the older format, which kept only the seconds. */
  at: number;
}

function readLocal(key: string): LocalPosition | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    if (raw.startsWith("{")) {
      const v = JSON.parse(raw) as Partial<LocalPosition>;
      return Number.isFinite(v.t) && (v.t as number) > 0 ? { t: v.t as number, at: Number(v.at) || 0 } : null;
    }
    const t = Number(raw);
    return Number.isFinite(t) && t > 0 ? { t, at: 0 } : null;
  } catch {
    return null; // storage blocked: the database copy still works
  }
}

function writeLocal(key: string, t: number) {
  try {
    if (t <= 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify({ t: Math.floor(t), at: Date.now() }));
  } catch {
    /* storage blocked or full: the database copy still works */
  }
}

/**
 * Where a video starts, and how the place the learner stops gets saved.
 *
 * The position is kept twice: in this browser (every few seconds, for an instant
 * resume here) and in the database (every 20 seconds, on pause, when the tab is
 * hidden and when the player closes), so it follows the learner to another
 * device and the dashboard knows which video they were watching last, in any
 * topic. Whichever copy is newer wins. The page mounts one player per video, so
 * this is worked out once per video.
 */
export function usePlaybackResume(videoId: string, learnerId?: string) {
  const { progressFor, savePlayback } = useApp();
  const key = `${LOCAL_PREFIX}${learnerId ?? "anon"}:${videoId}`;

  const [startAt] = React.useState(() => {
    const local = readLocal(key);
    const p = progressFor(videoId);
    const dbAt = p?.lastWatchedAt ? Date.parse(p.lastWatchedAt) || 0 : 0;
    if (local && local.at > dbAt) return local.t;
    if (dbAt) return Math.max(0, p?.positionSeconds ?? 0);
    return local?.t ?? 0;
  });

  // savePlayback is a new function on every store change; keep the latest one.
  const saveRef = React.useRef(savePlayback);
  saveRef.current = savePlayback;
  const track = React.useRef({ pos: startAt, local: startAt, db: startAt, dbAt: Date.now(), played: false, duration: 0 });

  const toPosition = (time: number, duration: number) =>
    time < EDGE_S || (duration > 0 && time > duration - EDGE_S) ? 0 : Math.floor(time);

  const persist = React.useCallback((pos: number) => {
    const t = track.current;
    t.dbAt = Date.now();
    if (Math.abs(pos - t.db) < 2) return;
    t.db = pos;
    saveRef.current(videoId, pos);
  }, [videoId]);

  /** Call on every time update with the current time and the clip's length. */
  const report = React.useCallback(
    (time: number, duration: number) => {
      const t = track.current;
      if (time > 0) t.played = true;
      t.pos = time;
      if (Number.isFinite(duration) && duration > 0) t.duration = duration;
      const pos = toPosition(time, t.duration);
      if (Math.abs(time - t.local) >= LOCAL_EVERY_S) {
        t.local = time;
        writeLocal(key, pos);
      }
      if (Date.now() - t.dbAt >= DB_EVERY_MS) persist(pos);
    },
    [key, persist],
  );

  /** Save now: on pause, when the tab is hidden, when the player closes. */
  const flush = React.useCallback(() => {
    const t = track.current;
    if (!t.played) return; // opened but never played: nothing changed
    const pos = toPosition(t.pos, t.duration);
    t.local = t.pos;
    writeLocal(key, pos);
    persist(pos);
  }, [key, persist]);

  /** The video reached its end; completing it resets the saved place to the start. */
  const ended = React.useCallback(() => {
    track.current.played = false;
    track.current.db = 0;
    writeLocal(key, 0);
  }, [key]);

  const flushRef = React.useRef(flush);
  flushRef.current = flush;
  React.useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushRef.current();
    };
    const onPageHide = () => flushRef.current();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flushRef.current(); // leaving the lesson (another video, the dashboard…)
    };
  }, []);

  return { startAt, report, flush, ended };
}
