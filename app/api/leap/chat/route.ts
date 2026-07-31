import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { GEMINI_MODEL, MAX_TRANSCRIPT_CHARS } from "@/lib/ai/config";
import { isClerkConfigured } from "@/lib/clerk/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchLessonContextServer, type LessonContext } from "@/lib/supabase/server";
import { parseJson } from "@/lib/api/validate";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

type Action = "summarize" | "quiz" | "deeper";

/** One `data:` payload from Gemini's alt=sse stream. */
interface GeminiChunk {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
}

// Bound every user-supplied string so a request can't inflate token cost or carry a
// prompt-injection-sized payload. The per-message cap is env-tunable (AI_MAX_MESSAGE_CHARS).
const MAX_MESSAGE_CHARS = Number(process.env.AI_MAX_MESSAGE_CHARS) || 4000;

const ChatSchema = z.object({
  // The lesson is identified by id and read from Supabase server-side. The client
  // does NOT get to supply the grounding text.
  videoId: z.string().min(1, "Missing lesson context.").max(100),
  // Mock-mode only (no Supabase configured): seed data lives in the browser, so the
  // client passes it through. Ignored entirely whenever Supabase IS configured.
  courseTitle: z.string().max(300).optional(),
  video: z
    .object({
      title: z.string().max(300).optional(),
      summary: z.string().max(4000).optional(),
      transcript: z.string().max(60_000).optional(),
    })
    .optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(MAX_MESSAGE_CHARS) }))
    .max(50)
    .optional()
    .default([]),
  action: z.enum(["summarize", "quiz", "deeper"]).optional(),
});

function actionDirective(action?: Action): string {
  switch (action) {
    case "summarize":
      return "The learner tapped “Summarize”. Give a concise summary of THIS lesson in 3–5 short bullet points, then a one-sentence takeaway.";
    case "quiz":
      return "The learner tapped “Quiz me”. Ask ONE focused question about THIS lesson and wait for their answer — do not reveal the answer yet.";
    case "deeper":
      return "The learner tapped “Explain deeper”. Elaborate on the key concept from THIS lesson with a concrete, practical example.";
    default:
      return "";
  }
}

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  // No key configured → tell the client to use its local mock fallback.
  if (!key) return NextResponse.json({ fallback: true });

  // The tutor is only used by signed-in learners on the gated /learn page. Require
  // a Clerk session in real mode so this isn't an open Gemini proxy. (Mock/dev with
  // no Clerk keys stays open for local use.)
  let userId: string | null = null;
  if (isClerkConfigured) {
    try {
      ({ userId } = await auth());
    } catch {
      userId = null;
    }
    if (!userId) return apiError(401, "Not authenticated.");
  }

  // Throttle per user (or per IP) — prevents Gemini abuse, denial-of-wallet, and scraping.
  const limited = enforceRate(req, "ai", userId);
  if (limited) return limited;

  const parsed = await parseJson(req, ChatSchema);
  if (!parsed.ok) return apiError(400, parsed.error);
  const { videoId, messages, action } = parsed.data;

  // Grounding material comes from the database — the transcript the admin saved with
  // the topic — so a caller can't inject their own prompt context. Only when Supabase
  // isn't configured (local mock mode, where the seed data exists solely in the
  // browser) do we accept the client's copy.
  let lesson: LessonContext;
  if (isSupabaseConfigured) {
    const fetched = await fetchLessonContextServer(videoId);
    // Unknown lesson id (or the read failed) → local fallback. A row with an empty
    // transcript is still fine: the tutor grounds on the title + summary instead.
    if (!fetched) return NextResponse.json({ fallback: true });
    lesson = fetched;
  } else {
    lesson = {
      courseTitle: parsed.data.courseTitle ?? "",
      title: parsed.data.video?.title ?? "",
      summary: parsed.data.video?.summary ?? "",
      transcript: parsed.data.video?.transcript ?? "",
    };
  }

  const transcript = lesson.transcript.slice(0, MAX_TRANSCRIPT_CHARS);
  const systemInstruction = [
    `You are the LEAP Coach AI tutor — a warm, encouraging learning assistant for the coaching topic “${lesson.courseTitle}”.`,
    `You are helping a learner with one specific lesson video: “${lesson.title}”.`,
    lesson.summary ? `Lesson summary: ${lesson.summary}` : "",
    transcript ? `Lesson transcript:\n${transcript}` : "",
    "",
    "Rules:",
    "- Stay strictly grounded in THIS lesson's material above. If asked about anything outside it, gently steer back to this lesson.",
    "- Be concise and conversational — a few short paragraphs or bullets at most. Use plain language.",
    "- You can summarize the lesson, quiz the learner, or explain its concepts in more depth.",
    "- Never invent facts that aren't supported by the lesson material above.",
  ]
    .filter(Boolean)
    .join("\n");

  // Map history → Gemini "contents". Drop the static welcome / any leading model
  // turns so the conversation starts with a user turn (Gemini requirement).
  const contents = messages
    .filter((m) => m.text?.trim())
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] }));
  while (contents.length && contents[0].role === "model") contents.shift();

  // Fold the quick-action directive into the latest user turn (avoid back-to-back user turns).
  const directive = actionDirective(action);
  if (directive) {
    const last = contents[contents.length - 1];
    if (last && last.role === "user") last.parts[0].text += `\n\n[${directive}]`;
    else contents.push({ role: "user", parts: [{ text: directive }] });
  }
  if (contents.length === 0)
    contents.push({ role: "user", parts: [{ text: "Introduce yourself and what you can help with for this lesson." }] });

  try {
    // Streaming (SSE) so the learner sees the answer appear as it's generated instead
    // of waiting on the full turn. Errors BEFORE the first token still return JSON
    // { fallback: true }; once bytes are flowing we can't retract them, so a mid-stream
    // failure keeps whatever was already shown.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;
    const init: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          // Flash models "think" by default and those hidden tokens count against
          // maxOutputTokens — they can swallow the whole budget and yield an empty
          // reply. A grounded tutor answer doesn't need reasoning; keep it off.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    };

    let res = await fetch(url, init);
    if (res.status === 503 || res.status === 500) {
      // Rolling aliases intermittently 503 with "high demand" — one retry clears most.
      await new Promise((r) => setTimeout(r, 700));
      res = await fetch(url, init);
    }

    if (!res.ok || !res.body) {
      console.error("[gemini] HTTP", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ fallback: true });
    }

    const upstream = res.body.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        let buffer = "";
        let chars = 0;
        let finishReason = "";
        try {
          for (;;) {
            const { done, value } = await upstream.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            // Gemini's alt=sse emits one JSON object per `data:` line.
            let nl: number;
            while ((nl = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              let chunk: GeminiChunk;
              try {
                chunk = JSON.parse(payload) as GeminiChunk;
              } catch {
                continue; // partial/!JSON line — skip rather than kill the stream
              }
              const candidate = chunk.candidates?.[0];
              if (candidate?.finishReason) finishReason = candidate.finishReason;
              const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
              if (text) {
                chars += text.length;
                emit({ delta: text });
              }
            }
          }
          // Not a single token — let the client fall back instead of showing an empty bubble.
          if (chars === 0) emit({ error: true });
          else emit({ done: true, finishReason });
        } catch (e) {
          logError("leap/chat stream", e);
          if (chars === 0) emit({ error: true });
          else emit({ done: true, finishReason: "ERROR" });
        } finally {
          controller.close();
        }
      },
      cancel(reason) {
        // Learner navigated away / aborted — stop pulling (and paying for) tokens.
        void upstream.cancel(reason);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // don't let a proxy buffer the stream into one blob
      },
    });
  } catch (e) {
    logError("leap/chat", e);
    return NextResponse.json({ fallback: true });
  }
}
