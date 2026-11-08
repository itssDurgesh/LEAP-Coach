import "server-only"; // holds the Mux signing key
import { createPrivateKey, sign, type KeyObject } from "node:crypto";

// Signed Mux playback.
//
// A public Mux playback id is a bearer link: anyone who has it can stream the video,
// from anywhere, for as long as the id exists. A *signed* playback id plays only
// with a token (an RS256 JWT) that expires, signed with a key only this server
// holds, and the server gives tokens only to learners who may open the topic
// (app/api/leap/playback).
//
// The key comes from the Mux dashboard (Settings → Signing keys): its id goes in
// MUX_SIGNING_KEY and its private key, as Mux gives it (base64), in MUX_PRIVATE_KEY.
// Without them nothing is signed and every video plays as it always has.
//
// Mux refuses a token sent with a PUBLIC playback id (HTTP 400), so while an account
// holds both kinds the server must know which one each id is. It asks Mux once per
// id: a public id's playlist loads without a token, a signed one answers 403. An id
// never changes kind, so the answer is remembered.

export type PlaybackPolicy = "public" | "signed" | "missing" | "unknown";

export interface PlaybackTokens {
  /** aud "v": the video itself. */
  playback: string;
  /** aud "t": the poster frame (when the topic has no thumbnail of its own). */
  thumbnail: string;
  /** aud "s": the preview frames shown while scrubbing the timeline. */
  storyboard: string;
}

export interface PlaybackGrant {
  playbackId: string;
  /** "signed": play with `tokens`. "public": play without (Mux refuses a token for a public id). */
  policy: "public" | "signed";
  tokens?: PlaybackTokens;
  /** When the tokens stop working, in ms since 1970. */
  expiresAt?: number;
}

/** A real Mux playback id (letters and digits), not empty and not one of the seed's "mux_…" placeholders. */
export function isMuxPlaybackId(id: string | null | undefined): id is string {
  return !!id && !id.startsWith("mux_") && /^[A-Za-z0-9_-]{1,200}$/.test(id);
}

// ── The signing key ────────────────────────────────────────────────────────

interface SigningKey {
  id: string;
  key: KeyObject;
}

let parsed: { id: string; raw: string; key: SigningKey | null } | null = null;

/** The key from MUX_SIGNING_KEY / MUX_PRIVATE_KEY, or null when they are not set (or unusable). */
function signingKey(): SigningKey | null {
  const id = process.env.MUX_SIGNING_KEY?.trim() ?? "";
  const raw = process.env.MUX_PRIVATE_KEY?.trim() ?? "";
  if (!id || !raw) return null;
  if (parsed && parsed.id === id && parsed.raw === raw) return parsed.key;
  let key: SigningKey | null = null;
  try {
    // Mux hands the private key out base64-encoded; a pasted PEM (with real or
    // escaped line breaks) works too.
    const pem = raw.includes("-----BEGIN") ? raw.replace(/\\n/g, "\n") : Buffer.from(raw, "base64").toString("utf8");
    key = { id, key: createPrivateKey(pem) };
  } catch (e) {
    console.error("[mux] MUX_PRIVATE_KEY is not a usable private key, so videos play unsigned:", (e as Error).message);
  }
  parsed = { id, raw, key };
  return key;
}

/** Whether this server can sign playback tokens. */
export function canSignPlayback(): boolean {
  return signingKey() !== null;
}

const b64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

/** One Mux token: `sub` the playback id, `aud` what it opens, `exp` in seconds. */
function token(key: SigningKey, playbackId: string, aud: "v" | "t" | "s", exp: number): string {
  const restriction = process.env.MUX_PLAYBACK_RESTRICTION_ID?.trim();
  // `kid` goes in the header (as Mux's own SDK puts it) and in the claims (as Mux's
  // guide lists it); Mux reads either.
  const header = { alg: "RS256", typ: "JWT", kid: key.id };
  const claims = { sub: playbackId, aud, exp, kid: key.id, ...(restriction ? { playback_restriction_id: restriction } : {}) };
  const body = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  return `${body}.${b64url(sign("sha256", Buffer.from(body), key.key))}`;
}

const HOUR = 3600;

/**
 * How long a token lasts: long enough to watch the whole video with pauses (Mux
 * advises more than the video's length, or its end may not load), short enough
 * that a copied link soon stops working. 6 hours plus twice the video, at most a day.
 */
export function tokenLifetimeSeconds(durationSeconds: number | null | undefined): number {
  const d = Number.isFinite(durationSeconds) && (durationSeconds as number) > 0 ? (durationSeconds as number) : 0;
  return Math.min(24 * HOUR, Math.round(6 * HOUR + 2 * d));
}

// ── Which kind of id ───────────────────────────────────────────────────────

const policies = new Map<string, { policy: PlaybackPolicy; at: number }>();
const KNOWN_FOR_MS = 24 * HOUR * 1000; // an id never changes kind
const UNSURE_FOR_MS = 60_000; // "missing" / "unknown": ask again soon

/**
 * Whether a playback id is public or signed, as Mux reports it: its playlist loads
 * without a token (public), or Mux answers 403 (signed) or 404 (no such id).
 * `fresh` skips the remembered answer (after the player was refused).
 */
export async function playbackPolicy(playbackId: string, opts: { fresh?: boolean } = {}): Promise<PlaybackPolicy> {
  if (!isMuxPlaybackId(playbackId)) return "missing";
  const known = policies.get(playbackId);
  if (!opts.fresh && known && Date.now() - known.at < (known.policy === "public" || known.policy === "signed" ? KNOWN_FOR_MS : UNSURE_FOR_MS)) {
    return known.policy;
  }
  let policy: PlaybackPolicy = "unknown";
  try {
    const res = await fetch(`https://stream.mux.com/${playbackId}.m3u8`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    policy = res.ok ? "public" : res.status === 403 || res.status === 401 ? "signed" : res.status === 404 ? "missing" : "unknown";
    await res.body?.cancel().catch(() => {});
  } catch (e) {
    console.error("[mux] could not check playback id", playbackId, (e as Error).message);
  }
  if (policies.size > 5000) policies.clear();
  policies.set(playbackId, { policy, at: Date.now() });
  return policy;
}

/**
 * What the player needs for one video. Without a signing key nothing is signed (the
 * site plays as it did before signed playback). With one, signed ids get tokens and
 * public ids play without; an id Mux could not be asked about is treated as signed,
 * since that is what an account with a signing key is moving to.
 */
export async function playbackGrant(
  playbackId: string,
  durationSeconds: number | null | undefined,
  opts: { fresh?: boolean; now?: number } = {},
): Promise<PlaybackGrant> {
  const key = signingKey();
  if (!key) return { playbackId, policy: "public" };
  const policy = await playbackPolicy(playbackId, { fresh: opts.fresh });
  if (policy === "public") return { playbackId, policy };
  const exp = Math.floor((opts.now ?? Date.now()) / 1000) + tokenLifetimeSeconds(durationSeconds);
  return {
    playbackId,
    policy: "signed",
    tokens: {
      playback: token(key, playbackId, "v", exp),
      thumbnail: token(key, playbackId, "t", exp),
      storyboard: token(key, playbackId, "s", exp),
    },
    expiresAt: exp * 1000,
  };
}
