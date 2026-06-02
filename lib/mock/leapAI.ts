import { Course, Video } from "@/lib/types";

// ── Mock LEAP AI responder ──
// This is the seam for the real Gemini call. The system prompt would include
// the course title, video topic, summary, and transcript (exactly what we pass
// here), keeping answers strictly grounded in the current lesson.

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type LeapAction = "summarize" | "quiz" | "deeper" | undefined;

export function leapReply(course: Course, video: Video, userText: string, action?: LeapAction): string {
  const sents = sentences(video.transcript);
  const lower = userText.toLowerCase();
  const act =
    action ??
    (/summar/.test(lower)
      ? "summarize"
      : /quiz|test me|question/.test(lower)
        ? "quiz"
        : /deeper|explain|elaborate|\bmore\b/.test(lower)
          ? "deeper"
          : undefined);

  if (act === "summarize") {
    const bullets = sents.slice(0, 3).map((s) => `•  ${s}`).join("\n");
    return `Here's a quick summary of "${video.title}":\n\n${bullets}\n\nIn short: ${video.summary}`;
  }

  if (act === "quiz") {
    const a =
      course.assignments.find((x) => x.afterVideoOrder >= video.order) ?? course.assignments[0];
    const q = a?.questions.find((x) => x.type === "mcq");
    if (q) {
      return `Quick check on this lesson 👇\n\n${q.prompt}\n\n${q.options
        .map((o, i) => `${String.fromCharCode(65 + i)}.  ${o}`)
        .join("\n")}\n\nReply with a letter and I'll tell you if you're right!`;
    }
    return `Quick check: in your own words, what's the core idea of "${video.title}"?\n\n(Hint: ${video.summary})`;
  }

  if (act === "deeper") {
    return `Let's go deeper on "${video.title}".\n\n${video.summary}\n\nA practical way to apply it: ${
      sents[sents.length - 1] ?? sents[0]
    }\n\nWant me to quiz you on it, or pull out the key points?`;
  }

  // default — answer using the most relevant transcript line, scoped to this lesson
  const words = lower.split(/\W+/).filter((w) => w.length > 3);
  const relevant = sents.find((s) => words.some((w) => s.toLowerCase().includes(w)));
  return `Great question — staying with this lesson, "${video.title}":\n\n${
    relevant ?? video.summary
  }\n\nI'm focused on this lesson's material, so I can summarize it, quiz you, or explain a concept in more depth. What would help most?`;
}

export function leapWelcome(video: Video): string {
  return `Hi! I'm your LEAP AI tutor for "${video.title}". I've studied this lesson and can summarize it, quiz you, or explain anything in more depth. Ask me anything about it!`;
}
