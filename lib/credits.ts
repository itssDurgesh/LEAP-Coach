import type { Course, QuestionFeedback, Submission, VideoProgress } from "@/lib/types";

// ── Per-topic credit "brain" ───────────────────────────────────────────────
// Each topic is worth up to 100 credits. A learner's credit for a topic is driven
// by how well they answered ITS checkpoint questions across the whole topic,
// weighted by the attempt on which each question was first solved (mastery decays
// with retries). Finalized once, when the topic is completed; the best result is
// kept if the learner redoes it. Total learningCredits = sum of per-topic credits.

export const TOPIC_CREDIT_MAX = 100;

// Mastery weight for one question, by the attempt it was solved on.
// The app allows up to 4 tries (with AI hints), but per the credit spec only the
// 1st–3rd count — a question solved only on the 4th try (or never) earns nothing.
// Legacy/simple submissions without per-attempt data fall back to correct = 1st try.
function questionWeight(f: Pick<QuestionFeedback, "correct" | "attempts" | "solved">): number {
  if (f.attempts == null) return f.correct ? 1 : 0; // no attempt data recorded
  if (!f.solved) return 0; // answer was revealed after exhausting tries
  if (f.attempts <= 1) return 1; // first try
  if (f.attempts === 2) return 0.7;
  if (f.attempts === 3) return 0.4;
  return 0; // solved only on the 4th+ try
}

// Ladder: attempt-weighted topic score (0–100) → topic credits (0–100).
function creditForPercent(percent: number, hasQuestions: boolean): number {
  if (!hasQuestions) return 0; // nothing to assess in this topic
  if (percent > 85) return 100;
  if (percent > 75) return 90;
  if (percent > 65) return 80;
  if (percent > 55) return 70;
  if (percent > 45) return 60;
  if (percent > 0) return 50;
  return 40; // completed the checkpoints but solved nothing within 3 tries → floor
}

export interface TopicCredit {
  totalQuestions: number;
  weightedPercent: number; // 0–100
  credit: number; // 0–100 (0 when the topic has no checkpoint questions)
}

/** A learner's credit for one topic, from their LATEST submission per checkpoint. */
export function topicCredit(course: Course, userId: string, submissions: Submission[]): TopicCredit {
  const mySubs = submissions.filter((s) => s.userId === userId && s.courseId === course.id);

  // Latest submission per assignment = the learner's final performance on it.
  const latestByAssignment = new Map<string, Submission>();
  for (const s of mySubs) {
    const cur = latestByAssignment.get(s.assignmentId);
    if (!cur || cur.attemptNumber < s.attemptNumber) latestByAssignment.set(s.assignmentId, s);
  }

  let totalQuestions = 0;
  let weightSum = 0;
  for (const a of course.assignments) {
    totalQuestions += a.questions.length;
    const latest = latestByAssignment.get(a.id);
    if (!latest) continue; // checkpoint not attempted → its questions count as unmastered
    const byId = new Map(latest.feedback.map((f) => [f.questionId, f]));
    for (const q of a.questions) {
      const f = byId.get(q.id);
      if (f) weightSum += questionWeight(f);
    }
  }

  const hasQuestions = totalQuestions > 0;
  const weightedPercent = hasQuestions ? (weightSum / totalQuestions) * 100 : 0;
  return { totalQuestions, weightedPercent, credit: creditForPercent(weightedPercent, hasQuestions) };
}

export interface CreditOutlook {
  /** Checkpoints the learner has attempted / the topic has. */
  checkpointsDone: number;
  checkpoints: number;
  /** What the topic would bank if the remaining checkpoints go as the attempted ones did; null before any. */
  projected: number | null;
}

/**
 * Where an unfinished topic's credit stands. Credits are banked only when a topic is
 * finished (topicCredit, above), so a learner who has passed checkpoints still has
 * 0 banked for it; this shows them what their answers so far are on track for. Same
 * weighting and ladder as the real credit, counted over the attempted checkpoints
 * only (the real one counts the rest as unanswered).
 */
export function creditOutlook(course: Course, userId: string, submissions: Submission[]): CreditOutlook {
  const latestByAssignment = new Map<string, Submission>();
  for (const s of submissions) {
    if (s.userId !== userId || s.courseId !== course.id) continue;
    const cur = latestByAssignment.get(s.assignmentId);
    if (!cur || cur.attemptNumber < s.attemptNumber) latestByAssignment.set(s.assignmentId, s);
  }
  let done = 0;
  let questions = 0;
  let weightSum = 0;
  for (const a of course.assignments) {
    const latest = latestByAssignment.get(a.id);
    if (!latest) continue;
    done += 1;
    const byId = new Map(latest.feedback.map((f) => [f.questionId, f]));
    for (const q of a.questions) {
      questions += 1;
      const f = byId.get(q.id);
      if (f) weightSum += questionWeight(f);
    }
  }
  return {
    checkpointsDone: done,
    checkpoints: course.assignments.length,
    projected: questions ? creditForPercent((weightSum / questions) * 100, true) : null,
  };
}

/**
 * A topic is finalized for credit once the learner has finished it: every video
 * completed AND every checkpoint attempted (has a submission). Pass/fail doesn't
 * gate it — someone who exhausted their tries still earns the floor.
 */
export function topicComplete(
  course: Course,
  userId: string,
  submissions: Submission[],
  progress: VideoProgress[],
): boolean {
  if (course.videos.length === 0) return false;
  const videoIds = new Set(course.videos.map((v) => v.id));
  const doneVideos = new Set(
    progress.filter((p) => p.userId === userId && p.completed && videoIds.has(p.videoId)).map((p) => p.videoId),
  );
  if (doneVideos.size < course.videos.length) return false;
  return course.assignments.every((a) =>
    submissions.some((s) => s.userId === userId && s.assignmentId === a.id),
  );
}
