import type { Course } from "@/lib/types";

/** Where a "Resume" button should take the learner, and what kind of place that is. */
export interface ResumeTarget {
  href: string;
  kind: "video" | "checkpoint" | "topic";
}

/** The store checks this needs; `useApp()` satisfies it. */
interface Checks {
  isEnrolled(courseId: string): boolean;
  hasAccess(courseId: string): boolean;
  isVideoCompleted(videoId: string): boolean;
  isVideoUnlocked(courseId: string, order: number): boolean;
  assignmentResult(assignmentId: string): { passed: boolean };
}

/**
 * The next step in a topic: the first unwatched video when it is open, the
 * checkpoint that is holding it back when it is locked, otherwise the topic page
 * (not enrolled yet, access lapsed, or nothing left to watch). Linking straight to
 * a locked video would only bounce the learner back to the topic page.
 */
export function resumeTarget(course: Course, s: Checks): ResumeTarget {
  const topic: ResumeTarget = { href: `/courses/${course.slug}`, kind: "topic" };
  if (!s.isEnrolled(course.id) || !s.hasAccess(course.id)) return topic;
  const next = [...course.videos].sort((a, b) => a.order - b.order).find((v) => !s.isVideoCompleted(v.id));
  if (!next) return topic;
  if (s.isVideoUnlocked(course.id, next.order)) return { href: `/learn/${course.id}/${next.order}`, kind: "video" };
  const gate = course.assignments.find((a) => a.afterVideoOrder === next.order - 1);
  if (gate && !s.assignmentResult(gate.id).passed) return { href: `/learn/${course.id}/assignment/${gate.id}`, kind: "checkpoint" };
  return topic;
}
