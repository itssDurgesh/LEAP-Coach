import type { Question } from "@/lib/types";

/** Remove the literal correct answer from a string so a fallback hint never leaks it. */
function stripAnswer(text: string, answer: string): string {
  if (!answer) return text;
  const re = new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
  return text.replace(re, "the right idea").replace(/\s{2,}/g, " ").trim();
}

/** Explanation-derived hint used when the AI is unavailable. Never reveals the answer. */
function localHint(q: Question, attempt: number): string {
  const safe = stripAnswer((q.explanation || "").trim(), q.correctAnswer);
  if (attempt >= 3) {
    return safe
      ? `Focus on the lesson's core idea: ${safe} Try ruling out the options that don't fit.`
      : "Re-read the lesson summary and rule out the options that don't fit its main point.";
  }
  if (safe) return `Hint: ${safe}`;
  return "Think back to the key idea from this lesson — which option best matches it?";
}

export interface HintRequest {
  courseTitle: string;
  video: { title: string; summary: string };
  question: Question;
  wrongAnswer: string;
  attempt: number;
}

/** Ask the AI for a no-reveal hint; fall back to an explanation-derived hint on any error. */
export async function fetchHint(req: HintRequest): Promise<string> {
  try {
    const res = await fetch("/api/leap/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseTitle: req.courseTitle,
        video: req.video,
        question: { prompt: req.question.prompt, options: req.question.options, type: req.question.type },
        wrongAnswer: req.wrongAnswer,
        correctAnswer: req.question.correctAnswer,
        explanation: req.question.explanation,
        attempt: req.attempt,
      }),
    });
    const data = await res.json();
    if (data?.hint) return data.hint as string;
  } catch {
    /* fall through to the local hint */
  }
  return localHint(req.question, req.attempt);
}
