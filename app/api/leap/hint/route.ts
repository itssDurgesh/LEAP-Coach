import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { GEMINI_MODEL } from "@/lib/ai/config";
import { isClerkConfigured } from "@/lib/clerk/config";
import { parseJson } from "@/lib/api/validate";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

// Generates a hint for a wrong answer on a checkpoint question. The hint nudges
// toward the right reasoning WITHOUT revealing the correct option. On no key / error
// it returns { fallback: true } so the client can show an explanation-derived hint.

const HintSchema = z.object({
  courseTitle: z.string().max(300).optional(),
  video: z.object({ title: z.string().max(300).optional(), summary: z.string().max(4000).optional() }).optional(),
  question: z.object({
    prompt: z.string().min(1).max(2000),
    options: z.array(z.string().max(500)).max(12).optional(),
    type: z.string().max(40).optional(),
  }),
  wrongAnswer: z.string().max(500).optional(),
  correctAnswer: z.string().min(1).max(500),
  explanation: z.string().max(4000).optional(),
  attempt: z.number().int().min(1).max(10).optional(),
});

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ fallback: true });

  // The checkpoint is on the gated /learn flow — require a Clerk session in real mode
  // so this isn't an open Gemini proxy (mock/dev with no Clerk keys stays open).
  let userId: string | null = null;
  if (isClerkConfigured) {
    try {
      ({ userId } = await auth());
    } catch {
      userId = null;
    }
    if (!userId) return apiError(401, "Not authenticated.");
  }

  // Throttle per user (or per IP) to prevent Gemini abuse / denial-of-wallet.
  const limited = enforceRate(req, "ai", userId);
  if (limited) return limited;

  // Lenient by design: the client shows an explanation-derived local hint on any
  // non-hint response, so invalid input degrades to fallback rather than erroring.
  const parsed = await parseJson(req, HintSchema);
  if (!parsed.ok) return NextResponse.json({ fallback: true });
  const body = parsed.data;

  const attempt = Math.max(1, Math.min(4, body.attempt ?? 1));
  const escalation =
    attempt >= 3
      ? "This is a later attempt — be more direct: help them eliminate a wrong option and point clearly at the underlying idea, but STILL do not name the correct answer."
      : attempt === 2
        ? "This is their second try — give a slightly more specific nudge than a generic one."
        : "This is their first try — give a gentle conceptual nudge.";

  const systemInstruction = [
    `You are the LEAP Coach AI tutor for the topic “${body.courseTitle ?? "this topic"}”.`,
    body.video?.title ? `The question is from the lesson “${body.video.title}”.` : "",
    "A learner just answered a checkpoint question INCORRECTLY and asked for a hint.",
    "",
    "Rules — follow ALL of them:",
    "- Give ONE short hint: 1–2 sentences, warm and encouraging.",
    "- NEVER reveal, name, quote, or strongly imply which option is correct.",
    "- Do NOT give the answer even if it would be faster. Guide their thinking instead.",
    "- Refer to the concept, not the option letter/text.",
    `- ${escalation}`,
  ]
    .filter(Boolean)
    .join("\n");

  const optionsList = (body.question.options ?? []).map((o, i) => `${i + 1}. ${o}`).join("\n");
  const userText = [
    `Question: ${body.question.prompt}`,
    optionsList ? `Options:\n${optionsList}` : "",
    body.wrongAnswer ? `The learner chose (incorrect): ${body.wrongAnswer}` : "",
    // Given to YOU only so the hint is relevant — never reveal it to the learner.
    `[Internal — do not reveal] Correct answer: ${body.correctAnswer}`,
    body.explanation ? `[Internal] Why: ${body.explanation}` : "",
    "Now give the learner a single helpful hint.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const init: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 200,
          // Thinking tokens count against maxOutputTokens; on a budget this small they
          // ate ~150 of 160 and shipped a hint cut off mid-sentence. A 1–2 sentence
          // nudge needs no reasoning — keep thinking off.
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
      console.error("[gemini hint] HTTP", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ fallback: true });
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const hint: string =
      candidate?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim() ?? "";
    // MAX_TOKENS means the hint was cut off mid-sentence — the client's local
    // explanation-derived hint is better than shipping a fragment.
    if (!hint || candidate?.finishReason === "MAX_TOKENS") return NextResponse.json({ fallback: true });
    return NextResponse.json({ hint });
  } catch (e) {
    logError("leap/hint", e);
    return NextResponse.json({ fallback: true });
  }
}
