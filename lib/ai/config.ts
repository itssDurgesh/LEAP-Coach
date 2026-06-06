// ── Gemini (LEAP AI tutor) config — SERVER ONLY ──
// The API key is never exposed to the browser; it is read only inside the
// `/api/leap/*` route handlers. When the key is absent the tutor gracefully
// falls back to the local mock responder (lib/mock/leapAI.ts).

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/** True when a Gemini key is configured (call from server code only). */
export const isGeminiConfigured = (): boolean => !!process.env.GEMINI_API_KEY;

/** Keep transcript context bounded so token cost/latency stays predictable. */
export const MAX_TRANSCRIPT_CHARS = 8000;
