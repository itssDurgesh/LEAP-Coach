import type { Course, Submission, User, VideoProgress } from "@/lib/types";
import { topicComplete } from "@/lib/credits";

/**
 * Stamps are small achievements shown on the dashboard and the public profile.
 * They are calculated from data the app already has (video progress, finished
 * topics, learning credits) every time they are shown. Nothing is stored, so a
 * stamp can never be out of step with the learner's real progress.
 */
export interface Stamp {
  id: string;
  label: string;
  earned: boolean;
  current: number;
  target: number;
}

type Measure = "videos" | "topics" | "credits";

const RULES: { id: string; label: string; target: number; measure: Measure }[] = [
  { id: "first_video", label: "First video", target: 1, measure: "videos" },
  { id: "first_topic", label: "First topic", target: 1, measure: "topics" },
  { id: "topics_5", label: "5 topics", target: 5, measure: "topics" },
  { id: "tier_learner", label: "Learner tier", target: 501, measure: "credits" },
  { id: "tier_advanced", label: "Advanced tier", target: 1001, measure: "credits" },
  { id: "topics_10", label: "10 topics", target: 10, measure: "topics" },
];

export function computeStamps(
  user: User,
  courses: Course[],
  submissions: Submission[],
  progress: VideoProgress[],
): Stamp[] {
  const totals: Record<Measure, number> = {
    videos: progress.filter((p) => p.userId === user.id && p.completed).length,
    topics: courses.filter((c) => topicComplete(c, user.id, submissions, progress)).length,
    credits: user.learningCredits,
  };
  return RULES.map((r) => {
    const current = Math.min(totals[r.measure], r.target);
    return { id: r.id, label: r.label, target: r.target, current, earned: current >= r.target };
  });
}
