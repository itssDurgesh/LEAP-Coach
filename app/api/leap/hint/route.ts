import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { generateContent } from "@/lib/ai/gemini";
import { isClerkConfigured } from "@/lib/clerk/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getServiceClient } from "@/lib/supabase/admin";
import { canOpenCourse, fetchQuestionContext } from "@/lib/learning/server";
import { localHint } from "@/lib/hint-text";
import { parseJson } from "@/lib/api/validate";
import { apiError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";
import { rejectIfBanned } from "@/lib/api/banned";

export const runtime = "nodejs";

// Generates a hint for a wrong answer on a checkpoint question. The hint nudges
// toward the right reasoning WITHOUT revealing the correct option. In real mode only
// the server has the explanation, so when the AI cannot answer it sends its own
// explanation-derived hint; in the local demo it returns { fallback: true } and the
// browser builds that hint.

// With the real services on (as in the browser), the question is read from the
// database by id: the prompt, options, correct answer and explanation that go into
// the instructions are not taken from the request. Only the local demo, whose
// topics exist solely in the browser, sends its own copy.
const GROUNDED_ON_SERVER = isClerkConfigured && isSupabaseConfigured;

const HintSchema = z.object({
  questionId: z.string().min(1).max(100),
  // What the learner did: their pick and which try this is.
  wrongAnswer: z.string().max(500).optional(),
  attempt: z.number().int().min(1).max(10).optional(),
  // Local demo only (see GROUNDED_ON_SERVER); ignored otherwise.
  courseTitle: z.string().max(300).optional(),
  video: z.object({ title: z.string().max(300).optional(), summary: z.string().max(4000).optional() }).optional(),
  question: z
    .object({
      prompt: z.string().max(2000).optional(),
      options: z.array(z.string().max(500)).max(12).optional(),
      type: z.string().max(40).optional(),
    })
    .optional(),
  correctAnswer: z.string().max(500).optional(),
  explanation: z.string().max(4000).optional(),
});

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key && !GROUNDED_ON_SERVER) return NextResponse.json({ fallback: true });

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
  // A suspended account keeps a valid Clerk session until it reloads, so the
  // client-side sign-out is not an authorization boundary.
  const banned = await rejectIfBanned(userId);
  if (banned) return banned;

  const limited = enforceRate(req, "ai", userId);
  if (limited) return limited;

  // Lenient by design: the client shows an explanation-derived local hint on any
  // non-hint response, so invalid input degrades to fallback rather than erroring.
  const parsed = await parseJson(req, HintSchema);
  if (!parsed.ok) return NextResponse.json({ fallback: true });
  const body = parsed.data;

  let q: { courseTitle: string; type: string; prompt: string; options: string[]; correctAnswer: string; explanation: string };
  let lessonTitle = "";
  if (GROUNDED_ON_SERVER) {
    const sb = getServiceClient();
    if (!sb) return NextResponse.json({ fallback: true });
    const read = await fetchQuestionContext(sb, body.questionId);
    if (!read.ok || !read.value.prompt || !read.value.correctAnswer) return NextResponse.json({ fallback: true });
    // Hints are for checkpoints the learner may take; nobody else gets one.
    if ((await canOpenCourse(sb, userId!, read.value.courseId)) !== true) return NextResponse.json({ fallback: true });
    q = read.value;
  } else {
    if (!body.question?.prompt || !body.correctAnswer) return NextResponse.json({ fallback: true });
    q = {
      courseTitle: body.courseTitle ?? "",
      type: body.question.type ?? "",
      prompt: body.question.prompt,
      options: body.question.options ?? [],
      correctAnswer: body.correctAnswer,
      explanation: body.explanation ?? "",
    };
    lessonTitle = body.video?.title ?? "";
  }

  // When the question has options (choices, or a word bank), the learner's pick is
  // passed on only if it is one of them, so no free text reaches the instructions.
  const wrongAnswer =
    body.wrongAnswer && (q.options.length === 0 || q.options.includes(body.wrongAnswer)) ? body.wrongAnswer : "";

  const attempt = Math.max(1, Math.min(4, body.attempt ?? 1));
  // The explanation-derived hint: what the learner gets when the AI cannot answer.
  const fallback = () =>
    GROUNDED_ON_SERVER
      ? NextResponse.json({ hint: localHint(q.explanation, q.correctAnswer, attempt) })
      : NextResponse.json({ fallback: true });
  if (!key) return fallback();
  const escalation =
    attempt >= 3
      ? "This is a later attempt — be more direct: help them eliminate a wrong option and point clearly at the underlying idea, but STILL do not name the correct answer."
      : attempt === 2
        ? "This is their second try — give a slightly more specific nudge than a generic one."
        : "This is their first try — give a gentle conceptual nudge.";

  const systemInstruction = [
    `You are the LEAP Coach AI tutor for the topic “${q.courseTitle || "this topic"}”.`,
    lessonTitle ? `The question is from the lesson “${lessonTitle}”.` : "",
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

  const optionsList = q.options.map((o, i) => `${i + 1}. ${o}`).join("\n");
  const userText = [
    `Question: ${q.prompt}`,
    optionsList ? `Options:\n${optionsList}` : "",
    wrongAnswer ? `The learner chose (incorrect): ${wrongAnswer}` : "",
    // Given to YOU only so the hint is relevant — never reveal it to the learner.
    `[Internal — do not reveal] Correct answer: ${q.correctAnswer}`,
    q.explanation ? `[Internal] Why: ${q.explanation}` : "",
    "Now give the learner a single helpful hint.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await generateContent({
    key,
    system: systemInstruction,
    contents: [{ role: "user", parts: [{ text: userText }] }],
    temperature: 0.5,
    // Thinking tokens are billed against this budget, so it has to cover the capped
    // thinking allowance AND the hint. At the old 200 a full thinking budget would
    // leave too little to finish a sentence — the truncation this route used to hit.
    maxOutputTokens: 500,
    scope: "gemini hint",
  });

  // MAX_TOKENS means the hint was cut off mid-sentence — the explanation-derived
  // hint is better than shipping a fragment.
  if (!result || !result.text || result.finishReason === "MAX_TOKENS") return fallback();
  return NextResponse.json({ hint: result.text });
}
