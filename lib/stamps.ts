import type { Course, EarnedStamp, IdeaResponse, Submission, User, VideoProgress } from "@/lib/types";
import { topicComplete } from "@/lib/credits";

/**
 * Stamps are achievements shown on the dashboard and on public profiles.
 *
 * The database awards them (public.award_stamps() in supabase/database.sql) into
 * `user_stamps`, with the date each was earned, whenever a learner finishes a
 * video, submits a checkpoint or answers an idea of the day. The rules below are
 * the same ones, so the learner's own screen can also show how close they are to
 * each stamp they do not hold yet, and show a stamp the moment it is earned,
 * before the database's copy arrives.
 */
export interface Stamp {
  id: string;
  label: string;
  /** One line saying what earns it. */
  hint: string;
  earned: boolean;
  /** When it was earned; null when not earned, or earned but the date is not known yet. */
  earnedAt: string | null;
  current: number;
  target: number;
}

type Measure = "videos" | "checkpoints" | "perfect" | "topics" | "credits" | "streak" | "ideas";

/** Same ids and thresholds as award_stamps() in the database. Order = display order. */
export const STAMP_RULES: { id: string; label: string; hint: string; target: number; measure: Measure }[] = [
  { id: "first_video", label: "First video", hint: "Finish your first video", target: 1, measure: "videos" },
  { id: "first_checkpoint", label: "First checkpoint", hint: "Pass a checkpoint", target: 1, measure: "checkpoints" },
  { id: "first_topic", label: "First topic", hint: "Finish every video and checkpoint in a topic", target: 1, measure: "topics" },
  { id: "perfect_score", label: "Perfect score", hint: "Score 100% on a checkpoint", target: 1, measure: "perfect" },
  { id: "videos_10", label: "10 videos", hint: "Finish ten videos", target: 10, measure: "videos" },
  { id: "streak_7", label: "7-day streak", hint: "Learn seven days in a row", target: 7, measure: "streak" },
  { id: "ideas_7", label: "Curious mind", hint: "Answer seven ideas of the day", target: 7, measure: "ideas" },
  { id: "tier_learner", label: "Learner tier", hint: "Reach 501 credits", target: 501, measure: "credits" },
  { id: "topics_5", label: "5 topics", hint: "Finish five topics", target: 5, measure: "topics" },
  { id: "tier_advanced", label: "Advanced tier", hint: "Reach 1,001 credits", target: 1001, measure: "credits" },
  { id: "topics_10", label: "10 topics", hint: "Finish ten topics", target: 10, measure: "topics" },
  { id: "tier_star", label: "Star tier", hint: "Reach 2,000 credits", target: 2000, measure: "credits" },
];

const STAMP_IDS = new Set(STAMP_RULES.map((r) => r.id));

/** A local calendar date, YYYY-MM-DD. */
function dayKey(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/**
 * Days in a row with learning activity (watching or finishing a video, submitting
 * a checkpoint, answering an idea of the day). `current` counts only a run that
 * reaches today or yesterday. Mirrors public.learning_streaks().
 */
export function learningStreaks(
  userId: string,
  progress: VideoProgress[],
  submissions: Submission[],
  ideaResponses: IdeaResponse[] = [],
  now: Date = new Date(),
): { current: number; best: number } {
  const days = new Set<string>();
  const add = (iso?: string | null) => {
    const k = iso ? dayKey(iso) : null;
    if (k) days.add(k);
  };
  for (const p of progress) {
    if (p.userId !== userId) continue;
    add(p.completedAt);
    add(p.lastWatchedAt);
  }
  for (const s of submissions) if (s.userId === userId) add(s.submittedAt);
  for (const r of ideaResponses) if (r.userId === userId) add(r.createdAt);
  if (!days.size) return { current: 0, best: 0 };

  const sorted = [...days].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const today = dayKey(now.toISOString())!;
  const last = sorted[sorted.length - 1];
  const current = daysBetween(last, today) <= 1 ? run : 0;
  return { current, best };
}

/**
 * Every stamp with the learner's progress towards it. `earned` comes from the
 * database's user_stamps rows when there are any for the stamp, and otherwise
 * from the learner's own data (which is what the database will award).
 */
export function computeStamps(
  user: User,
  courses: Course[],
  submissions: Submission[],
  progress: VideoProgress[],
  ideaResponses: IdeaResponse[] = [],
  earned: EarnedStamp[] = [],
): Stamp[] {
  const mySubs = submissions.filter((s) => s.userId === user.id);
  const totals: Record<Measure, number> = {
    videos: progress.filter((p) => p.userId === user.id && p.completed).length,
    checkpoints: new Set(mySubs.filter((s) => s.passed).map((s) => s.assignmentId)).size,
    perfect: mySubs.some((s) => s.score >= 100) ? 1 : 0,
    topics: courses.filter((c) => topicComplete(c, user.id, submissions, progress)).length,
    credits: user.learningCredits,
    streak: learningStreaks(user.id, progress, submissions, ideaResponses).best,
    ideas: ideaResponses.filter((r) => r.userId === user.id).length,
  };
  const earnedAt = new Map(earned.filter((e) => e.userId === user.id).map((e) => [e.stampId, e.earnedAt]));
  return STAMP_RULES.map((r) => {
    const current = Math.min(totals[r.measure], r.target);
    const fromDb = earnedAt.get(r.id) ?? null;
    return {
      id: r.id,
      label: r.label,
      hint: r.hint,
      target: r.target,
      current: fromDb ? r.target : current,
      earned: !!fromDb || current >= r.target,
      earnedAt: fromDb,
    };
  });
}

/**
 * Someone else's stamps, from the database alone (their progress rows are private).
 * Only earned stamps are listed, newest first.
 */
export function earnedStampsOnly(earned: EarnedStamp[]): Stamp[] {
  const rules = new Map(STAMP_RULES.map((r) => [r.id, r]));
  return earned
    .filter((e) => STAMP_IDS.has(e.stampId))
    .sort((a, b) => (a.earnedAt < b.earnedAt ? 1 : -1))
    .map((e) => {
      const r = rules.get(e.stampId)!;
      return { id: r.id, label: r.label, hint: r.hint, target: r.target, current: r.target, earned: true, earnedAt: e.earnedAt };
    });
}
