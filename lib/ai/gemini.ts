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

/**
 * The longest a learner waits for one reply, retries included. There was no limit:
 * a stalled call held the chat on its typing dots until the platform cut it off.
 */
const DEADLINE_MS = 25_000;

const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`;
const ENDPOINT = `${BASE}:generateContent`;
// Server-sent events: one JSON object per `data:` line, each carrying the next piece.
const STREAM_ENDPOINT = `${BASE}:streamGenerateContent?alt=sse`;

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
 * Send one request with the retries below and return the final response, or null
 * when it never got an answer (network failure, deadline). Never throws.
 *
 * Retries cover the two ways this call fails in practice:
 *   • 500/503 — rolling aliases intermittently report "high demand"; one retry clears most.
 *   • 400     — a model rollover rejecting our generationConfig. We retry once WITHOUT
 *               thinkingConfig so a future incompatibility degrades to a working (if
 *               chattier) tutor instead of silently serving mock replies again.
 */
async function request(endpoint: string, req: GeminiRequest, signal: AbortSignal): Promise<Response | null> {
  const headers = { "Content-Type": "application/json", "x-goog-api-key": req.key };
  const send = (withThinkingConfig: boolean) =>
    fetch(endpoint, { method: "POST", headers, body: buildBody(req, withThinkingConfig), signal });

  try {
    let res = await send(true);

    if (res.status === 503 || res.status === 500) {
      await res.body?.cancel().catch(() => {});
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
    return res;
  } catch (e) {
    console.error(`[${req.scope}] request failed:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** The text and finish reason of one response (or one streamed piece). */
function readCandidate(data: unknown): GeminiReply {
  const candidate = (data as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] })
    ?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return { text, finishReason: candidate?.finishReason };
}

/**
 * Call Gemini and return the reply, or `null` when it could not be produced — callers
 * treat null as "use the local fallback". Never throws.
 */
export async function generateContent(req: GeminiRequest): Promise<GeminiReply | null> {
  const signal = AbortSignal.timeout(DEADLINE_MS); // one clock for the call and its retries
  const res = await request(ENDPOINT, req, signal);
  if (!res) return null;
  try {
    const reply = readCandidate(await res.json());
    return { text: reply.text.trim(), finishReason: reply.finishReason };
  } catch (e) {
    console.error(`[${req.scope}] unreadable reply:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Like generateContent, but the reply arrives piece by piece as it is generated, so
 * a learner reads the start of an answer instead of waiting for all of it.
 *
 * The same retries apply; they all happen before the first piece. Resolves to null
 * when the call could not start (the caller answers as it would to a failed
 * generateContent). The pieces are yielded as they arrive; the iteration never
 * throws: a connection that drops part-way, or `signal` (the learner went away),
 * just ends it, and the last piece then carries finishReason "ERROR". The deadline
 * covers the whole reply.
 */
export async function streamContent(
  req: GeminiRequest,
  signal?: AbortSignal,
): Promise<AsyncGenerator<GeminiReply, void, undefined> | null> {
  const deadline = AbortSignal.timeout(DEADLINE_MS);
  const res = await request(STREAM_ENDPOINT, req, signal ? AbortSignal.any([deadline, signal]) : deadline);
  if (!res?.body) return null;
  const body = res.body;

  return (async function* pieces() {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let piece: GeminiReply;
          try {
            piece = readCandidate(JSON.parse(payload));
          } catch {
            continue; // a line that is not JSON: skip it rather than end the reply
          }
          if (piece.text || piece.finishReason) yield piece;
        }
      }
    } catch (e) {
      if (!signal?.aborted) console.error(`[${req.scope}] stream cut off:`, e instanceof Error ? e.message : e);
      yield { text: "", finishReason: "ERROR" };
    } finally {
      reader.cancel().catch(() => {});
    }
  })();
}
