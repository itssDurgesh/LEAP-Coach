import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { GEMINI_MODEL, MAX_TRANSCRIPT_CHARS } from "@/lib/ai/config";
import { isClerkConfigured } from "@/lib/clerk/config";
import { parseJson } from "@/lib/api/validate";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

type Action = "summarize" | "quiz" | "deeper";

// Bound every user-supplied string so a request can't inflate token cost or carry a
// prompt-injection-sized payload. The per-message cap is env-tunable (AI_MAX_MESSAGE_CHARS).
const MAX_MESSAGE_CHARS = Number(process.env.AI_MAX_MESSAGE_CHARS) || 4000;

const ChatSchema = z.object({
  courseTitle: z.string().max(300).optional().default(""),
  video: z.object({
    title: z.string().min(1, "Missing lesson context.").max(300),
    summary: z.string().max(4000).optional().default(""),
    transcript: z.string().max(60_000).optional().default(""),
  }),
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
  const { courseTitle, video, messages, action } = parsed.data;

  const transcript = video.transcript.slice(0, MAX_TRANSCRIPT_CHARS);
  const systemInstruction = [
    `You are the LEAP Coach AI tutor — a warm, encouraging learning assistant for the coaching topic “${courseTitle}”.`,
    `You are helping a learner with one specific lesson video: “${video.title}”.`,
    video.summary ? `Lesson summary: ${video.summary}` : "",
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
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

    if (!res.ok) {
      console.error("[gemini] HTTP", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ fallback: true });
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const reply: string =
      candidate?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim() ?? "";

    // MAX_TOKENS means the reply was cut off mid-sentence — worse than the fallback.
    if (!reply || candidate?.finishReason === "MAX_TOKENS") return NextResponse.json({ fallback: true });
    return NextResponse.json({ reply });
  } catch (e) {
    logError("leap/chat", e);
    return NextResponse.json({ fallback: true });
  }
}
