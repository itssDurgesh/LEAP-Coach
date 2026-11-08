import { isClerkConfigured } from "@/lib/clerk/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// The browser's side of signed Mux playback (app/api/leap/playback,
// lib/mux/playback.ts): the playback id and, for a signed id, the tokens that let
// the player stream it until they expire.

export interface PlaybackTokens {
  playback: string;
  thumbnail: string;
  storyboard: string;
}

export interface PlaybackGrant {
  playbackId: string;
  policy: "public" | "signed";
  tokens?: PlaybackTokens;
  /** When the tokens stop working (ms since 1970). */
  expiresAt?: number;
}

/** ok:false only for a final answer: no access (403) or no such video (404). */
export type PlaybackResult = { ok: true; grant: PlaybackGrant } | { ok: false; status: number; error: string };

const realMode = isClerkConfigured && isSupabaseConfigured;

/** A grant is reused while its tokens have at least this long left. */
const REUSE_MS = 30 * 60_000;

type Entry = { promise: Promise<PlaybackResult>; grant?: PlaybackGrant };
const grants = new Map<string, Entry>();

const unsigned = (video: { muxPlaybackId: string }): PlaybackResult => ({
  ok: true,
  grant: { playbackId: video.muxPlaybackId, policy: "public" },
});

/** `keep`: an answer from the server worth reusing (not a fallback, not a refusal). */
async function request(video: { id: string; muxPlaybackId: string }, retry: boolean): Promise<{ result: PlaybackResult; keep: boolean }> {
  try {
    const res = await fetch("/api/leap/playback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: video.id, ...(retry ? { retry: true } : {}) }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data && typeof data.playbackId === "string") return { result: { ok: true, grant: data as PlaybackGrant }, keep: true };
    if (res.status === 403 || res.status === 404) {
      const error = (data && typeof data.error === "string" && data.error) || "This video isn't available.";
      return { result: { ok: false, status: res.status, error }, keep: false };
    }
  } catch {
    // offline, or the request never finished: fall through
  }
  // The server could not be asked (offline, a deploy, a hiccup): try the id the
  // topic data has. A public id plays; a signed one is refused by Mux, and the
  // player then asks here again (MuxVideoPlayer's error handling).
  return { result: unsigned(video), keep: false };
}

/**
 * What the player needs for one Mux video. The lesson page asks as soon as it knows
 * the video, while the player's code is still downloading, and the player gets the
 * same answer. `retry` asks again after Mux refused what the player had.
 */
export function loadPlayback(
  video: { id: string; muxPlaybackId: string },
  learnerId: string | undefined,
  opts: { retry?: boolean } = {},
): Promise<PlaybackResult> {
  // The local demo has no server to ask; its videos play from the topic data.
  if (!realMode) return Promise.resolve(unsigned(video));

  const key = `${learnerId ?? ""}:${video.id}:${video.muxPlaybackId}`;
  const cached = grants.get(key);
  const usable = (g?: PlaybackGrant) => !g || g.expiresAt == null || g.expiresAt - Date.now() > REUSE_MS;
  if (cached && !opts.retry && usable(cached.grant)) return cached.promise;

  const entry = {} as Entry;
  entry.promise = request(video, !!opts.retry).then(({ result, keep }) => {
    if (keep && result.ok) entry.grant = result.grant;
    else if (grants.get(key) === entry) grants.delete(key);
    return result;
  });
  grants.set(key, entry);
  return entry.promise;
}
