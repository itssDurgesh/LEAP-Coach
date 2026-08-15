import "server-only"; // takes the Gemini key as an argument — keep out of the client bundle
import { GEMINI_MODEL } from "./config";

/**
 * The single place the app talks to Gemini. Both AI routes (`/api/leap/chat` and
 * `/api/leap/hint`) go through here so their retry/failure behaviour can't drift.
 *
 * Why a shared helper: the two routes had byte-identical call + retry code, and in
 * Aug 2026 BOTH silently broke at once when a rolling model alias started rejecting
 * `thinkingBudget: 0` (see THINKING_BUDGET below). Because a failed call degrades to
 * the local mock, nobody sees an error — the tutor just gets dumber. Centralising the
 * call means one fix covers every caller.
 */

/**
 * Thinking tokens are billed against `maxOutputTokens`, and on a tight budget they
 * can swallow the whole allowance and ship a reply cut off mid-sentence — so we cap
 * them low rather than letting the model reason freely.
 *
 * It must be a small POSITIVE number, not 0: `gemini-flash-lite-latest` now answers
 * `thinkingBudget: 0` with HTTP 400 INVALID_ARGUMENT (thinking can no longer be
 * switched off entirely on that alias). 0 is what broke both routes in production.
 */
const THINKING_BUDGET = 128;

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiRequest {
  key: string;
  system: string;
  /** Gemini `contents` — conversation turns, already ordered to start with a user turn. */
  contents: unknown[];
  temperature: number;
  maxOutputTokens: number;
  /** Log prefix identifying the caller, e.g. "gemini chat". */
  scope: string;
}

export interface GeminiReply {
  text: string;
  /** "STOP" on a complete answer; "MAX_TOKENS" when the model ran out of room. */
  finishReason?: string;
}

function buildBody(req: GeminiRequest, withThinkingConfig: boolean): string {
  return JSON.stringify({
    system_instruction: { parts: [{ text: req.system }] },
    contents: req.contents,
    generationConfig: {
      temperature: req.temperature,
      maxOutputTokens: req.maxOutputTokens,
      ...(withThinkingConfig ? { thinkingConfig: { thinkingBudget: THINKING_BUDGET } } : {}),
    },
  });
}

/**
 * Call Gemini and return the reply, or `null` when it could not be produced — callers
 * treat null as "use the local fallback". Never throws.
 *
 * Retries cover the two ways this call fails in practice:
 *   • 500/503 — rolling aliases intermittently report "high demand"; one retry clears most.
 *   • 400     — a model rollover rejecting our generationConfig. We retry once WITHOUT
 *               thinkingConfig so a future incompatibility degrades to a working (if
 *               chattier) tutor instead of silently serving mock replies again.
 */
export async function generateContent(req: GeminiRequest): Promise<GeminiReply | null> {
  const headers = { "Content-Type": "application/json", "x-goog-api-key": req.key };

  const send = (withThinkingConfig: boolean) =>
    fetch(ENDPOINT, { method: "POST", headers, body: buildBody(req, withThinkingConfig) });

  try {
    let res = await send(true);

    if (res.status === 503 || res.status === 500) {
      await new Promise((r) => setTimeout(r, 700));
      res = await send(true);
    }

    if (res.status === 400) {
      const detail = await res.text().catch(() => "");
      console.error(`[${req.scope}] HTTP 400 with thinkingConfig — retrying without it.`, detail.slice(0, 300));
      res = await send(false);
    }

    if (!res.ok) {
      console.error(`[${req.scope}] HTTP`, res.status, (await res.text().catch(() => "")).slice(0, 300));
      return null;
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const text: string =
      candidate?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim() ?? "";

    return { text, finishReason: candidate?.finishReason };
  } catch (e) {
    console.error(`[${req.scope}] request failed:`, e instanceof Error ? e.message : e);
    return null;
  }
}
