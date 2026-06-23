import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GEMINI_MODEL } from "@/lib/ai/config";
import { isClerkConfigured } from "@/lib/clerk/config";

export const runtime = "nodejs";

// Generates a hint for a wrong answer on a checkpoint question. The hint nudges
// toward the right reasoning WITHOUT revealing the correct option. On no key / error
// it returns { fallback: true } so the client can show an explanation-derived hint.

interface HintBody {
  courseTitle?: string;
  video?: { title?: string; summary?: string };
  question: { prompt: string; options?: string[]; type?: string };
  wrongAnswer?: string;
  correctAnswer: string;
  explanation?: string;
  attempt?: number; // which wrong attempt this is (1-based)
}

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ fallback: true });

  // The checkpoint is on the gated /learn flow — require a Clerk session in real mode
  // so this isn't an open Gemini proxy (mock/dev with no Clerk keys stays open).
  if (isClerkConfigured) {
    try {
      const { userId } = await auth();
      if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    } catch {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
  }

  let body: HintBody;
  try {
    body = (await req.json()) as HintBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.question?.prompt || !body.correctAnswer) {
    return NextResponse.json({ fallback: true });
  }

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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 160 },
        }),
      },
    );

    if (!res.ok) {
      console.error("[gemini hint] HTTP", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ fallback: true });
    }

    const data = await res.json();
    const hint: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim() ?? "";
    if (!hint) return NextResponse.json({ fallback: true });
    return NextResponse.json({ hint });
  } catch (e) {
    console.error("[gemini hint] request failed", e);
    return NextResponse.json({ fallback: true });
  }
}
