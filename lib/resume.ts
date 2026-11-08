import type { Course, Submission, Video, VideoProgress } from "@/lib/types";

/** Where a "Resume" button should take the learner, and what kind of place that is. */
export interface ResumeTarget {
  href: string;
  kind: "video" | "checkpoint" | "topic";
  /** The video it opens, when kind is "video". */
  video?: Video;
  /**
   * Seconds into that video where the learner stopped; 0 = from the start. The
   * player picks the same position up itself, this is only for labels.
   */
  positionSeconds?: number;
}

/** The store checks this needs; `useApp()` satisfies it. */
interface Checks {
  isEnrolled(courseId: string): boolean;
  hasAccess(courseId: string): boolean;
  isVideoCompleted(videoId: string): boolean;
  isVideoUnlocked(courseId: string, order: number): boolean;
  assignmentResult(assignmentId: string): { passed: boolean };
  /** The signed-in learner's progress row for a video (position, last watched). */
  progressFor?(videoId: string): VideoProgress | undefined;
}

const time = (iso?: string | null) => (iso ? Date.parse(iso) || 0 : 0);

/**
 * The next step in a topic:
 *  1. the video the learner stopped part-way through most recently, at the place
 *     they stopped, unless they have finished a video since (then they moved on);
 *  2. otherwise the first unwatched video when it is open;
 *  3. the checkpoint holding it back when it is locked;
 *  4. otherwise the topic page (not enrolled yet, access lapsed, nothing left).
 * Linking straight to a locked video would only bounce the learner back to the
 * topic page.
 */
export function resumeTarget(course: Course, s: Checks): ResumeTarget {
  const topic: ResumeTarget = { href: `/courses/${course.slug}`, kind: "topic" };
  if (!s.isEnrolled(course.id) || !s.hasAccess(course.id)) return topic;
  const videos = [...course.videos].sort((a, b) => a.order - b.order);

  if (s.progressFor) {
    let lastFinished = 0;
    let stopped: { video: Video; p: VideoProgress } | null = null;
    for (const v of videos) {
      const p = s.progressFor(v.id);
      if (!p) continue;
      if (p.completed) lastFinished = Math.max(lastFinished, time(p.completedAt));
      if ((p.positionSeconds ?? 0) > 0 && p.lastWatchedAt && (!stopped || time(p.lastWatchedAt) > time(stopped.p.lastWatchedAt)))
        stopped = { video: v, p };
    }
    if (stopped && time(stopped.p.lastWatchedAt) >= lastFinished && s.isVideoUnlocked(course.id, stopped.video.order))
      return {
        href: `/learn/${course.id}/${stopped.video.order}`,
        kind: "video",
        video: stopped.video,
        positionSeconds: stopped.p.positionSeconds ?? 0,
      };
  }

  const next = videos.find((v) => !s.isVideoCompleted(v.id));
  if (!next) return topic;
  if (s.isVideoUnlocked(course.id, next.order)) {
    const p = s.progressFor?.(next.id);
    return { href: `/learn/${course.id}/${next.order}`, kind: "video", video: next, positionSeconds: p?.positionSeconds ?? 0 };
  }
  const gate = course.assignments.find((a) => a.afterVideoOrder === next.order - 1);
  if (gate && !s.assignmentResult(gate.id).passed) return { href: `/learn/${course.id}/assignment/${gate.id}`, kind: "checkpoint" };
  return topic;
}

/**
 * When the learner last did anything in a topic (ms since epoch, 0 = never):
 * watched part of a video, finished one, or submitted a checkpoint. This is what
 * puts the topic they were just in at the top of the dashboard.
 */
export function topicLastActivity(course: Course, userId: string, progress: VideoProgress[], submissions: Submission[]): number {
  const videoIds = new Set(course.videos.map((v) => v.id));
  let last = 0;
  for (const p of progress) {
    if (p.userId !== userId || (p.courseId !== course.id && !videoIds.has(p.videoId))) continue;
    last = Math.max(last, time(p.lastWatchedAt), time(p.completedAt));
  }
  for (const sub of submissions) {
    if (sub.userId === userId && sub.courseId === course.id) last = Math.max(last, time(sub.submittedAt));
  }
  return last;
}
