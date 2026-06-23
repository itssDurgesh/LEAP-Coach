import type { Course, Enrollment, Submission, VideoProgress } from "@/lib/types";

// End-of-topic performance report. Pure function over the learner's progress so it's
// easy to compute on the course page (and testable). The rating rewards answering
// checkpoint questions within the first one or two tries (see the interactive checkpoint).

export interface TopicReport {
  completed: boolean; // all videos done + every checkpoint passed
  daysToComplete: number | null; // whole days from enrollment to last completion (null until done)
  videosCompleted: number;
  totalVideos: number;
  checkpointsPassed: number;
  totalCheckpoints: number;
  avgScore: number; // 0–100 across attempted checkpoints
  questionsRated: number; // questions with recorded per-question attempts
  firstTwoTries: number; // of those, solved within two tries
  stars: number; // 1–5 rating
}

const DAY = 24 * 60 * 60 * 1000;

export function buildTopicReport(
  course: Course,
  userId: string,
  submissions: Submission[],
  progress: VideoProgress[],
  enrollment: Enrollment | undefined,
): TopicReport {
  const videoIds = new Set(course.videos.map((v) => v.id));
  const myProgress = progress.filter((p) => p.userId === userId && videoIds.has(p.videoId) && p.completed);
  const totalVideos = course.videos.length;
  const videosCompleted = myProgress.length;

  const assignments = course.assignments;
  const totalCheckpoints = assignments.length;
  const mySubs = submissions.filter((x) => x.userId === userId && x.courseId === course.id);

  // Latest submission per assignment (their final performance).
  const latestByAssignment = new Map<string, Submission>();
  for (const s of mySubs) {
    const cur = latestByAssignment.get(s.assignmentId);
    if (!cur || cur.attemptNumber < s.attemptNumber) latestByAssignment.set(s.assignmentId, s);
  }

  let checkpointsPassed = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  let questionsRated = 0;
  let firstTwoTries = 0;
  for (const a of assignments) {
    if (mySubs.some((x) => x.assignmentId === a.id && x.passed)) checkpointsPassed++;
    const latest = latestByAssignment.get(a.id);
    if (latest) {
      scoreSum += latest.score;
      scoreCount++;
      for (const f of latest.feedback) {
        if (f.attempts != null) {
          questionsRated++;
          if (f.solved && f.attempts <= 2) firstTwoTries++;
        }
      }
    }
  }
  const avgScore = scoreCount ? Math.round(scoreSum / scoreCount) : 0;
  const completed =
    totalVideos > 0 && videosCompleted >= totalVideos && checkpointsPassed >= totalCheckpoints;

  // Last completion timestamp = latest of any completed video / submitted checkpoint.
  let lastTs = 0;
  for (const p of myProgress) if (p.completedAt) lastTs = Math.max(lastTs, +new Date(p.completedAt));
  for (const s of latestByAssignment.values()) lastTs = Math.max(lastTs, +new Date(s.submittedAt));
  let daysToComplete: number | null = null;
  if (completed && enrollment?.enrolledAt && lastTs) {
    daysToComplete = Math.max(0, Math.round((lastTs - +new Date(enrollment.enrolledAt)) / DAY));
  }

  // Rating: share of rated questions solved within two tries; fall back to score
  // when no per-question attempts were recorded (e.g. legacy submissions).
  const rate = questionsRated > 0 ? firstTwoTries / questionsRated : avgScore / 100;
  const stars = rate >= 0.9 ? 5 : rate >= 0.75 ? 4 : rate >= 0.6 ? 3 : rate >= 0.4 ? 2 : 1;

  return {
    completed,
    daysToComplete,
    videosCompleted,
    totalVideos,
    checkpointsPassed,
    totalCheckpoints,
    avgScore,
    questionsRated,
    firstTwoTries,
    stars,
  };
}
