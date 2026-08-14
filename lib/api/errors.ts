import { NextResponse } from "next/server";

/**
 * Shared API error handling — pillar #5 (no information leakage).
 *
 * Two rules this enforces:
 *   1. The HTTP response body only ever contains a short, generic, user-safe message.
 *      Raw database errors, stack traces, and server file paths are NEVER serialized
 *      to the client.
 *   2. Full diagnostic detail is logged server-side via `logError` so we can still
 *      debug. (Swap `console.error` for Sentry/Datadog/etc. in one place later.)
 */

/** A JSON error response with a safe, generic message. Optionally merge extra safe fields. */
export function apiError(
  status: number,
  message: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Log full diagnostic detail — SERVER SIDE ONLY. Never called with anything that
 * reaches the client. Centralized so the logging backend can be swapped in one place.
 */
export function logError(scope: string, err: unknown): void {
  const detail =
    err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ""}` : safeStringify(err);
  console.error(`[${scope}]`, detail);
}

function safeStringify(v: unknown): string {
  try {
    return typeof v === "string" ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}
