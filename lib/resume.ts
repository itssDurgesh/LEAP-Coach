import type { Course, Video } from "@/lib/types";

/** Where a "Resume" button should take the learner, and what kind of place that is. */
export interface ResumeTarget {
  href: string;
  kind: "video" | "checkpoint" | "topic";
  /** The video it opens (kind "video"). */
  video?: Video;
  /** Where in that video playback picks up, in seconds; 0 = from the start. */
  seconds?: number;
}

/** The store checks this needs; `useApp()` satisfies it. */
interface Checks {
  isEnrolled(courseId: string): boolean;
  hasAccess(courseId: string): boolean;
  isVideoCompleted(videoId: string): boolean;
  isVideoUnlocked(courseId: string, order: number): boolean;
  assignmentResult(assignmentId: string): { passed: boolean };
  lastWatchedVideo(courseId: string): { videoId: string; seconds: number; at: number } | null;
  watchPosition(videoId: string): { seconds: number; at: number } | null;
}

/**
 * The next step in a topic:
 *   1. the video the learner was last in, at the place they left it (a saved place
 *      is only kept mid-video: the players store 0 in the opening and closing
 *      seconds), so switching to another topic and back returns them to it;
 *   2. otherwise the first unwatched video when it is open;
 *   3. otherwise the checkpoint that is holding it back, when it is locked;
 *   4. otherwise the topic page (not enrolled yet, access lapsed, or nothing left).
 * Linking straight to a locked video would only bounce the learner back to the topic page.
 */
export function resumeTarget(course: Course, s: Checks): ResumeTarget {
  const topic: ResumeTarget = { href: `/courses/${course.slug}`, kind: "topic" };
  if (!s.isEnrolled(course.id) || !s.hasAccess(course.id)) return topic;

  const last = s.lastWatchedVideo(course.id);
  if (last && last.seconds > 0) {
    const video = course.videos.find((v) => v.id === last.videoId);
    if (video && s.isVideoUnlocked(course.id, video.order))
      return { href: `/learn/${course.id}/${video.order}`, kind: "video", video, seconds: last.seconds };
  }

  const next = [...course.videos].sort((a, b) => a.order - b.order).find((v) => !s.isVideoCompleted(v.id));
  if (!next) return topic;
  if (s.isVideoUnlocked(course.id, next.order))
    return { href: `/learn/${course.id}/${next.order}`, kind: "video", video: next, seconds: s.watchPosition(next.id)?.seconds ?? 0 };
  const gate = course.assignments.find((a) => a.afterVideoOrder === next.order - 1);
  if (gate && !s.assignmentResult(gate.id).passed) return { href: `/learn/${course.id}/assignment/${gate.id}`, kind: "checkpoint" };
  return topic;
}
