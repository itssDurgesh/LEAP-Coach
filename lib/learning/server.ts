import "server-only"; // service-role reads of answers, transcripts and other learners' rows
import type { SupabaseClient } from "@supabase/supabase-js";
import { isCourseAccessExpired } from "@/lib/access";
import { topicComplete, topicCredit } from "@/lib/credits";
import { courseCategories, type Course, type Role, type Submission, type VideoProgress } from "@/lib/types";

// Server side of the learning flow: who may open a topic, the tutor's and the hint
// route's reading of a session or question, checkpoint grading, and credits. Every
// read here uses the service role, because since the 2026-11-05 migration the
// browser's key can no longer read transcripts, media or answers.

type Row = Record<string, any>;

/** "missing": no such row. "error": the read failed, so nothing is known either way. */
export type ServerRead<T> = { ok: true; value: T } | { ok: false; reason: "missing" | "error" };

/** A parent row embedded by PostgREST: an object, or (some versions) a one-item array. */
function one<T>(v: T | T[] | null | undefined): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

function missingFunction(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || error.code === "42883" || /could not find the function|does not exist/i.test(error.message ?? "");
}

// ── Access ──────────────────────────────────────────────────────────────────

/**
 * Whether `userId` may open `courseId`: the same rule as the browser's hasAccess
 * and the database's user_has_course_access() (free topics; an all-access plan, a
 * category pass or a purchase whose one-year window is open; admins). Banned
 * accounts open nothing. null when it could not be checked.
 */
export async function canOpenCourse(sb: SupabaseClient, userId: string, courseId: string): Promise<boolean | null> {
  const rpc = await sb.rpc("user_has_course_access", { p_user_id: userId, p_course_id: courseId });
  if (!rpc.error) return rpc.data === true;
  if (!missingFunction(rpc.error)) {
    console.error("[access] user_has_course_access", rpc.error.message);
    return null;
  }
  // A database without the 2026-11-05 migration: the same rule, worked out here.
  const [profile, course, purchases, passes] = await Promise.all([
    sb.from("profiles").select("is_admin, banned, subscription_plan, subscription_valid_until").eq("id", userId).maybeSingle(),
    sb.from("courses").select("id, price, category, categories, access_duration_days").eq("id", courseId).maybeSingle(),
    sb.from("course_purchases").select("course_id, purchased_at").eq("user_id", userId),
    sb.from("category_passes").select("category, granted_at").eq("user_id", userId),
  ]);
  if (profile.error || course.error || purchases.error || passes.error) return null;
  const p = profile.data as Row | null;
  const c = course.data as Row | null;
  if (!p || !c || p.banned) return false;
  if (p.is_admin) return true;
  const accessCourse = {
    id: c.id as string,
    price: Number(c.price ?? 0),
    category: c.category as Role,
    categories: (c.categories ?? []) as Role[],
    accessDurationDays: (c.access_duration_days as number | null) ?? null,
  };
  if (accessCourse.price === 0) return true;
  const owned = ((purchases.data ?? []) as Row[]).map((r) => r.course_id as string);
  const cats = ((passes.data ?? []) as Row[]).map((r) => r.category as Role);
  const user = {
    subscriptionPlan: p.subscription_plan ?? "none",
    subscriptionValidUntil: p.subscription_valid_until ?? null,
    ownedCourseIds: owned,
    coursePurchasedAt: Object.fromEntries(((purchases.data ?? []) as Row[]).filter((r) => r.purchased_at).map((r) => [r.course_id, r.purchased_at])),
    ownedCategories: cats,
    categoryPassAt: Object.fromEntries(((passes.data ?? []) as Row[]).filter((r) => r.granted_at).map((r) => [r.category, r.granted_at])),
  };
  const granted =
    user.subscriptionPlan === "all_access" ||
    courseCategories(accessCourse).some((cat) => cats.includes(cat)) ||
    owned.includes(courseId);
  return granted && !isCourseAccessExpired(user, accessCourse);
}

// ── What the tutor and the hints read ──────────────────────────────────────

export interface LessonContext {
  courseId: string;
  courseTitle: string;
  title: string;
  transcript: string;
}

/** One session's tutoring material, by video id: its title, its topic and its transcript. */
export async function fetchLessonContext(sb: SupabaseClient, videoId: string): Promise<ServerRead<LessonContext>> {
  const { data, error } = await sb
    .from("videos")
    .select("title, transcript, course_id, courses(title)")
    .eq("id", videoId)
    .maybeSingle();
  if (error) {
    console.error("[tutor] lesson read failed", error.message);
    return { ok: false, reason: "error" };
  }
  if (!data) return { ok: false, reason: "missing" };
  const course = one(data.courses as { title?: string } | { title?: string }[] | null);
  return {
    ok: true,
    value: { courseId: data.course_id ?? "", courseTitle: course?.title ?? "", title: data.title ?? "", transcript: data.transcript ?? "" },
  };
}

export interface QuestionContext {
  id: string;
  assignmentId: string;
  courseId: string;
  courseTitle: string;
  type: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

/** One checkpoint question, with its answer and explanation (which never leave the server). */
export async function fetchQuestionContext(sb: SupabaseClient, questionId: string): Promise<ServerRead<QuestionContext>> {
  const { data, error } = await sb
    .from("questions")
    .select("id, assignment_id, type, prompt, options, correct_answer, explanation, assignments(course_id, courses(title))")
    .eq("id", questionId)
    .maybeSingle();
  if (error) {
    console.error("[checkpoint] question read failed", error.message);
    return { ok: false, reason: "error" };
  }
  if (!data) return { ok: false, reason: "missing" };
  const assignment = one(data.assignments as { course_id?: string; courses?: unknown } | { course_id?: string; courses?: unknown }[] | null);
  const course = one(assignment?.courses as { title?: string } | { title?: string }[] | null | undefined);
  return {
    ok: true,
    value: {
      id: data.id,
      assignmentId: data.assignment_id ?? "",
      courseId: assignment?.course_id ?? "",
      courseTitle: course?.title ?? "",
      type: data.type ?? "",
      prompt: data.prompt ?? "",
      options: Array.isArray(data.options) ? (data.options as unknown[]).map(String) : [],
      correctAnswer: data.correct_answer ?? "",
      explanation: data.explanation ?? "",
    },
  };
}

// ── Checkpoint grading ─────────────────────────────────────────────────────

/** Tries per question before the answer is shown (the checkpoint page says the same). */
export const MAX_QUESTION_TRIES = 4;

export const sameAnswer = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** This learner's current attempt at a checkpoint: one more than the attempts already submitted. */
export async function currentAttempt(sb: SupabaseClient, userId: string, assignmentId: string): Promise<number | null> {
  const { count, error } = await sb
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("assignment_id", assignmentId);
  if (error) {
    console.error("[checkpoint] attempt count failed", error.message);
    return null;
  }
  return (count ?? 0) + 1;
}

export interface QuestionState {
  status: "open" | "solved" | "revealed";
  tries: number;
  wrong: string[];
  /** Only once the question is solved or its answer shown. */
  answer?: string;
  explanation?: string;
}

/** How one question stands in a checkpoint attempt, from its checkpoint_progress row (or none yet). */
export function questionState(row: Row | null | undefined, q: Pick<QuestionContext, "correctAnswer" | "explanation">): QuestionState {
  const tries = Number(row?.tries ?? 0);
  const wrong = Array.isArray(row?.wrong) ? (row!.wrong as unknown[]).map(String) : [];
  if (row?.solved) return { status: "solved", tries, wrong, answer: q.correctAnswer, explanation: q.explanation };
  if (row?.revealed) return { status: "revealed", tries, wrong, answer: q.correctAnswer, explanation: q.explanation };
  return { status: "open", tries, wrong };
}

// ── Credits ────────────────────────────────────────────────────────────────

export interface Credits {
  learningCredits: number;
  topicCredits: Record<string, number>;
}

const toSubmission = (r: Row): Submission => ({
  id: r.id, userId: r.user_id, assignmentId: r.assignment_id, courseId: r.course_id, answers: r.answers ?? {},
  score: Number(r.score ?? 0), passed: !!r.passed, feedback: r.feedback ?? [], attemptNumber: r.attempt_number ?? 1, submittedAt: r.submitted_at,
});

/**
 * Finalise a learner's credit for one topic once the topic is complete, keeping the
 * best result (lib/credits.ts, the same rules the dashboard shows). Learners can no
 * longer write their own credits, so this is the one place they change. Returns the
 * learner's credits afterwards, or null when they could not be read.
 */
export async function refreshTopicCredit(sb: SupabaseClient, userId: string, courseId: string): Promise<Credits | null> {
  const [courseRes, subsRes, progressRes, profileRes] = await Promise.all([
    sb.from("courses").select("id, videos(id), assignments(id, questions(id))").eq("id", courseId).maybeSingle(),
    sb.from("submissions").select("*").eq("user_id", userId).eq("course_id", courseId),
    sb.from("video_progress").select("user_id, video_id, course_id, completed").eq("user_id", userId).eq("course_id", courseId),
    sb.from("profiles").select("learning_credits, topic_credits").eq("id", userId).maybeSingle(),
  ]);
  if (courseRes.error || subsRes.error || progressRes.error || profileRes.error || !profileRes.data) {
    console.error("[credits] read failed", courseRes.error?.message ?? subsRes.error?.message ?? progressRes.error?.message ?? profileRes.error?.message);
    return null;
  }
  const current: Credits = {
    learningCredits: Number(profileRes.data.learning_credits ?? 0),
    topicCredits: (profileRes.data.topic_credits ?? {}) as Record<string, number>,
  };
  const c = courseRes.data as Row | null;
  if (!c) return current;
  const course = {
    id: c.id,
    videos: ((c.videos ?? []) as Row[]).map((v) => ({ id: v.id })),
    assignments: ((c.assignments ?? []) as Row[]).map((a) => ({ id: a.id, questions: ((a.questions ?? []) as Row[]).map((q) => ({ id: q.id })) })),
  } as unknown as Course;
  const submissions = ((subsRes.data ?? []) as Row[]).map(toSubmission);
  const progress = ((progressRes.data ?? []) as Row[]).map(
    (p) => ({ userId: p.user_id, videoId: p.video_id, courseId: p.course_id, completed: !!p.completed }) as VideoProgress,
  );
  if (!topicComplete(course, userId, submissions, progress)) return current;
  const credit = topicCredit(course, userId, submissions).credit;
  if (credit <= (current.topicCredits[courseId] ?? 0)) return current;
  const topicCredits = { ...current.topicCredits, [courseId]: credit };
  const learningCredits = Object.values(topicCredits).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const { error } = await sb.from("profiles").update({ learning_credits: learningCredits, topic_credits: topicCredits }).eq("id", userId);
  if (error) {
    console.error("[credits] write failed", error.message);
    return current;
  }
  return { learningCredits, topicCredits };
}
