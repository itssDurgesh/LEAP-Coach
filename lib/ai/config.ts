import "server-only"; // reads GEMINI_API_KEY — keep out of the client bundle

// ── Gemini (LEAP AI tutor) config — SERVER ONLY ──
// The API key is never exposed to the browser; it is read only inside the
// `/api/leap/*` route handlers. When the key is absent the tutor gracefully
// falls back to the local mock responder (lib/mock/leapAI.ts).

// "gemini-flash-lite-latest" is Google's rolling alias for the current Flash-Lite —
// the cheapest tier, free-quota eligible. Do NOT pin a bare generation id like
// "gemini-2.5-flash": Google retired it for new API keys (hard 404), and because
// every /api/leap/* caller swallows errors into the mock fallback, the tutor
// degrades silently rather than failing loudly. Override via GEMINI_MODEL if a
// rollover ever regresses.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

/** Keep transcript context bounded so token cost/latency stays predictable. */
export const MAX_TRANSCRIPT_CHARS = 8000;
