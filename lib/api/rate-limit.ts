import { NextResponse } from "next/server";

/**
 * Multi-tiered rate limiting — pillar #1.
 *
 * Backed by an in-memory sliding-window store behind the small `RateStore` interface,
 * so a distributed store (e.g. Upstash Redis) can be dropped in later WITHOUT touching
 * any call site — just implement `RateStore` and swap `store` below.
 *
 * ⚠️ In-memory counters are PER SERVER INSTANCE and reset on redeploy. That is fine at
 * the current scale (single instance / low traffic; Clerk already throttles auth). If
 * the app ever runs multiple instances behind a load balancer, switch to a shared store
 * here — this file is the single swap point.
 *
 * Thresholds are configurable via env vars (per-minute), all with safe defaults:
 *   RL_AI_PER_MIN · RL_PAYMENT_PER_MIN · RL_ADMIN_PER_MIN · RL_EMAIL_PER_MIN ·
 *   RL_TELEGRAM_PER_MIN · RL_DEFAULT_PER_MIN.  Set RL_DISABLED=1 to turn limiting off.
 */

export interface RateResult {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
}

/** Swap target: implement this against Redis to go multi-instance. */
export interface RateStore {
  /** Record a hit for `key` and return the number of hits within the trailing `windowMs`. */
  hit(key: string, windowMs: number): number;
}

// ── In-memory sliding-window store ──────────────────────────────────────────
class MemoryStore implements RateStore {
  private hits = new Map<string, number[]>();
  private lastSweep = Date.now();

  hit(key: string, windowMs: number): number {
    const now = Date.now();
    const cutoff = now - windowMs;
    const arr = this.hits.get(key) ?? [];
    // Drop timestamps that have aged out of the window.
    let start = 0;
    while (start < arr.length && arr[start] <= cutoff) start++;
    const pruned = start > 0 ? arr.slice(start) : arr;
    pruned.push(now);
    this.hits.set(key, pruned);
    this.maybeSweep(now);
    return pruned.length;
  }

  // Periodically evict stale keys so the map can't grow unbounded.
  private maybeSweep(now: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    const horizon = now - 5 * 60_000;
    for (const [k, arr] of this.hits) {
      if (!arr.length || arr[arr.length - 1] < horizon) this.hits.delete(k);
    }
  }
}

const store: RateStore = new MemoryStore();

// ── Tiers (env-configurable, per minute) ────────────────────────────────────
export type TierName = "ai" | "payment" | "admin" | "email" | "telegram" | "default";

const WINDOW_MS = 60_000;

const TIER_ENV: Record<TierName, { env: string; def: number }> = {
  ai: { env: "RL_AI_PER_MIN", def: 20 }, // tight — Gemini denial-of-wallet / scraping
  payment: { env: "RL_PAYMENT_PER_MIN", def: 12 },
  admin: { env: "RL_ADMIN_PER_MIN", def: 30 },
  email: { env: "RL_EMAIL_PER_MIN", def: 6 }, // very tight — broadcast blasts
  telegram: { env: "RL_TELEGRAM_PER_MIN", def: 10 },
  default: { env: "RL_DEFAULT_PER_MIN", def: 60 },
};

function limitFor(tier: TierName): number {
  const { env, def } = TIER_ENV[tier];
  const n = Number(process.env[env]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

/** Stable per-caller key: the Clerk user id when signed in, else the client IP. */
export function clientKey(req: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

/** Core check. Namespaced by tier so tiers don't share a bucket. */
export function checkRate(tier: TierName, key: string): RateResult {
  if (process.env.RL_DISABLED === "1") {
    return { ok: true, limit: Infinity, remaining: Infinity, retryAfterSec: 0 };
  }
  const limit = limitFor(tier);
  const count = store.hit(`${tier}:${key}`, WINDOW_MS);
  if (count > limit) {
    return { ok: false, limit, remaining: 0, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
  }
  return { ok: true, limit, remaining: Math.max(0, limit - count), retryAfterSec: 0 };
}

/** 429 response with a Retry-After header and a safe generic message. */
export function tooManyRequests(result: RateResult, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    { error: "Too many requests — please slow down and try again in a moment.", ...extra },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } },
  );
}

/**
 * One-liner for route handlers. Returns null when the request is under the limit, or a
 * ready-to-return 429 NextResponse when it is over.
 *
 *   const limited = enforceRate(req, "ai", userId);
 *   if (limited) return limited;
 */
export function enforceRate(
  req: Request,
  tier: TierName,
  userId?: string | null,
  extra?: Record<string, unknown>,
): NextResponse | null {
  const result = checkRate(tier, clientKey(req, userId));
  return result.ok ? null : tooManyRequests(result, extra);
}
