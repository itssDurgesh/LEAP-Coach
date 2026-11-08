"use client";

import * as React from "react";
import type { Course, Video } from "@/lib/types";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isClerkConfigured } from "@/lib/clerk/config";
import * as db from "@/lib/supabase/db";

/**
 * Session transcripts, fetched on demand.
 *
 * They used to arrive with every page load, for every session of every topic, though
 * only the lesson page (one session at a time) and the topic editor read them. The
 * store now leaves `video.transcript` undefined until something asks for it here.
 * A video that already carries its transcript (the local demo, or a topic an admin
 * just saved) is answered from that, with no request.
 */

// Same rule as the store: the database is used only with real sign-in configured.
const live = isClerkConfigured && isSupabaseConfigured;

// One request per session per page lifetime. A failed request is not kept, so the
// next ask tries again.
const cache = new Map<string, Promise<string>>();

export function loadTranscript(video: Pick<Video, "id" | "transcript">): Promise<string> {
  if (video.transcript !== undefined) return Promise.resolve(video.transcript);
  const sb = live ? getSupabase() : null;
  if (!sb) return Promise.resolve("");
  let pending = cache.get(video.id);
  if (!pending) {
    pending = db.fetchVideoTranscript(sb, video.id);
    cache.set(video.id, pending);
    pending.catch(() => cache.delete(video.id));
  }
  return pending;
}

export type TranscriptState =
  | { status: "loading"; text: "" }
  | { status: "ready"; text: string }
  | { status: "error"; text: "" };

/** The transcript of `video` for rendering, with a retry for when it could not be read. */
export function useTranscript(video: Pick<Video, "id" | "transcript">): TranscriptState & { retry(): void } {
  const [result, setResult] = React.useState<{ id: string; state: TranscriptState } | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const { id, transcript } = video;

  React.useEffect(() => {
    if (transcript !== undefined) return; // already in hand: nothing to fetch
    let active = true;
    loadTranscript({ id, transcript }).then(
      (text) => active && setResult({ id, state: { status: "ready", text } }),
      () => active && setResult({ id, state: { status: "error", text: "" } }),
    );
    return () => {
      active = false;
    };
  }, [id, transcript, attempt]);

  const retry = React.useCallback(() => {
    setResult(null);
    setAttempt((n) => n + 1);
  }, []);

  if (transcript !== undefined) return { status: "ready", text: transcript, retry };
  if (!result || result.id !== id) return { status: "loading", text: "", retry };
  return { ...result.state, retry };
}

/**
 * The topic with every session's transcript filled in, for the topic editor: it
 * copies the topic once when it opens, and saving that copy must not write empty
 * transcripts over real ones. Rejects when they could not be read.
 */
export async function withTranscripts(course: Course): Promise<Course> {
  if (course.videos.every((v) => v.transcript !== undefined)) return course;
  const sb = live ? getSupabase() : null;
  if (!sb) return course;
  const byId = await db.fetchCourseTranscripts(sb, course.id);
  return {
    ...course,
    videos: course.videos.map((v) => (v.transcript !== undefined ? v : { ...v, transcript: byId.get(v.id) ?? "" })),
  };
}
