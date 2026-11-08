import type { Question } from "@/lib/types";
import { isClerkConfigured } from "@/lib/clerk/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { localHint } from "@/lib/hint-text";

// With the real services on, the hint route reads the question from the database by
// id; only the local demo (topics in this browser only) sends its own copy.
const live = isClerkConfigured && isSupabaseConfigured;

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
        questionId: req.question.id,
        wrongAnswer: req.wrongAnswer,
        attempt: req.attempt,
        ...(live
          ? {}
          : {
              courseTitle: req.courseTitle,
              video: req.video,
              question: { prompt: req.question.prompt, options: req.question.options, type: req.question.type },
              correctAnswer: req.question.correctAnswer,
              explanation: req.question.explanation,
            }),
      }),
    });
    const data = await res.json();
    if (data?.hint) return data.hint as string;
  } catch {
    /* fall through to the local hint */
  }
  // In real mode this copy has no explanation (hidden), so this is the generic nudge;
  // the route sends its own explanation-based hint whenever it can.
  return localHint(req.question.explanation, req.question.correctAnswer, req.attempt);
}
