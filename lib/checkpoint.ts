import type { Submission } from "@/lib/types";

// The browser's side of server-graded checkpoints (app/api/leap/checkpoint) and of
// banking credits (app/api/leap/credits). Used in real mode once the database stops
// handing answers to the browser; the local demo grades in the browser as before.

export interface ServerQuestionState {
  status: "open" | "solved" | "revealed";
  tries: number;
  wrong: string[];
  /** Sent once the question is solved or its answer shown. */
  answer?: string;
  explanation?: string;
}

export interface Credits {
  learningCredits: number;
  topicCredits: Record<string, number>;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

async function post<T>(url: string, body: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: (data && typeof data.error === "string" && data.error) || "Something went wrong. Please try again." };
    return { ok: true, value: data as T };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}

/** Where the current attempt at a checkpoint stands (so a reload keeps the tries made). */
export const checkpointState = (assignmentId: string) =>
  post<{ attempt: number; questions: Record<string, ServerQuestionState> }>("/api/leap/checkpoint", { action: "state", assignmentId });

/** Grade one try at a question. */
export const checkAnswer = (questionId: string, answer: string) =>
  post<ServerQuestionState & { attempt: number }>("/api/leap/checkpoint", { action: "check", questionId, answer });

/** Finish the attempt: the server writes the submission and banks any credit. */
export const submitCheckpoint = (assignmentId: string) =>
  post<{ submission: Submission; credits: Credits | null }>("/api/leap/checkpoint", { action: "submit", assignmentId });

/** Bank the credit for a topic that may just have been completed. */
export async function refreshCredits(courseId: string): Promise<Credits | null> {
  const r = await post<{ credits: Credits }>("/api/leap/credits", { courseId });
  return r.ok ? r.value.credits : null;
}
