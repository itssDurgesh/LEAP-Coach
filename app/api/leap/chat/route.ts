import { NextRequest, NextResponse } from "next/server";
import { GEMINI_MODEL, MAX_TRANSCRIPT_CHARS } from "@/lib/ai/config";

export const runtime = "nodejs";

type Action = "summarize" | "quiz" | "deeper";

interface ChatBody {
  courseTitle: string;
  video: { title: string; summary: string; transcript: string };
  messages: { role: "user" | "assistant"; text: string }[];
  action?: Action;
}

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

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { courseTitle, video, messages = [], action } = body;
  if (!video?.title) return NextResponse.json({ error: "Missing lesson context." }, { status: 400 });

  const transcript = (video.transcript || "").slice(0, MAX_TRANSCRIPT_CHARS);
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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        }),
      },
    );

    if (!res.ok) {
      console.error("[gemini] HTTP", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ fallback: true });
    }

    const data = await res.json();
    const reply: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim() ?? "";

    if (!reply) return NextResponse.json({ fallback: true });
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[gemini] request failed", e);
    return NextResponse.json({ fallback: true });
  }
}
