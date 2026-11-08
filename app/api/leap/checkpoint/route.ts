import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getServiceClient } from "@/lib/supabase/admin";
import {
  MAX_QUESTION_TRIES,
  canOpenCourse,
  currentAttempt,
  fetchQuestionContext,
  questionState,
  refreshTopicCredit,
  sameAnswer,
  type QuestionContext,
} from "@/lib/learning/server";
import { parseJson } from "@/lib/api/validate";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";
import { rejectIfBanned } from "@/lib/api/banned";
import type { QuestionFeedback, Submission } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/leap/checkpoint: checkpoints graded on the server.
 *
 * The browser no longer receives answers or explanations (2026-11-05 migration), so
 * it cannot grade, and learners can no longer write their own submissions. Each try
 * is recorded in checkpoint_progress, and the submission is built from those records,
 * so a score reflects the tries actually made.
 *
 *   { action: "state",  assignmentId }         where this attempt stands (after a reload)
 *   { action: "check",  questionId, answer }   grade one try
 *   { action: "submit", assignmentId }         finish the attempt: submission + credits
 *
 * A question's answer and explanation are sent once it is solved or its tries are
 * used up, as the checkpoint page always showed them then.
 */
const PASS_MARK = 60;

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("state"), assignmentId: z.string().min(1).max(100) }),
  z.object({ action: z.literal("check"), questionId: z.string().min(1).max(100), answer: z.string().min(1).max(500) }),
  z.object({ action: z.literal("submit"), assignmentId: z.string().min(1).max(100) }),
]);

type Row = Record<string, any>;

export async function POST(req: NextRequest) {
  // The local demo grades in the browser (its topics exist only there).
  if (!isClerkConfigured || !isSupabaseConfigured) return apiError(503, "Checkpoints are graded in the browser here.");

  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    userId = null;
  }
  if (!userId) return apiError(401, "Not authenticated.");
  const banned = await rejectIfBanned(userId);
  if (banned) return banned;
  const limited = enforceRate(req, "default", userId);
  if (limited) return limited;

  const sb = getServiceClient();
  if (!sb) return apiError(503, "Server not configured for this action.");
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return apiError(400, parsed.error);
  const body = parsed.data;

  try {
    if (body.action === "check") {
      const read = await fetchQuestionContext(sb, body.questionId);
      if (!read.ok) return apiError(read.reason === "missing" ? 404 : 500, read.reason === "missing" ? "That question no longer exists." : "Could not check your answer.");
      const q = read.value;
      const open = await canOpenCourse(sb, userId, q.courseId);
      if (open === null) return apiError(500, "Could not check your answer.");
      if (!open) return apiError(403, "This checkpoint is part of a topic you don't have access to.");
      if (q.options.length && !q.options.some((o) => o === body.answer)) return apiError(400, "Pick one of the options.");

      const attempt = await currentAttempt(sb, userId, q.assignmentId);
      if (attempt === null) return apiError(500, "Could not check your answer.");
      const { data: row, error } = await sb
        .from("checkpoint_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("question_id", q.id)
        .eq("attempt_number", attempt)
        .maybeSingle();
      if (error) throw error;
      const before = questionState(row, q);
      // Already settled, or this exact wrong answer was already tried: nothing to count.
      if (before.status !== "open" || before.wrong.some((w) => sameAnswer(w, body.answer))) {
        return NextResponse.json({ attempt, ...before });
      }
      const solved = sameAnswer(body.answer, q.correctAnswer);
      const tries = before.tries + 1;
      const wrong = solved ? before.wrong : [...before.wrong, body.answer];
      const revealed = !solved && tries >= MAX_QUESTION_TRIES;
      const saved = await sb.from("checkpoint_progress").upsert({
        user_id: userId, question_id: q.id, assignment_id: q.assignmentId, attempt_number: attempt,
        tries, wrong, solved, revealed, updated_at: new Date().toISOString(),
      });
      if (saved.error) throw saved.error;
      return NextResponse.json({ attempt, ...questionState({ tries, wrong, solved, revealed }, q) });
    }

    // state / submit: the whole checkpoint.
    const { data: a, error: aErr } = await sb
      .from("assignments")
      .select("id, course_id, questions(id, type, prompt, options, correct_answer, explanation)")
      .eq("id", body.assignmentId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!a) return apiError(404, "That checkpoint no longer exists.");
    const open = await canOpenCourse(sb, userId, a.course_id);
    if (open === null) return apiError(500, "Could not load this checkpoint.");
    if (!open) return apiError(403, "This checkpoint is part of a topic you don't have access to.");
    const questions: QuestionContext[] = ((a.questions ?? []) as Row[]).map((r) => ({
      id: r.id, assignmentId: a.id, courseId: a.course_id, courseTitle: "", type: r.type ?? "", prompt: r.prompt ?? "",
      options: Array.isArray(r.options) ? r.options.map(String) : [], correctAnswer: r.correct_answer ?? "", explanation: r.explanation ?? "",
    }));
    const attempt = await currentAttempt(sb, userId, a.id);
    if (attempt === null) return apiError(500, "Could not load this checkpoint.");
    const { data: progressRows, error: pErr } = await sb
      .from("checkpoint_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("assignment_id", a.id)
      .eq("attempt_number", attempt);
    if (pErr) throw pErr;
    const byQuestion = new Map(((progressRows ?? []) as Row[]).map((r) => [r.question_id as string, r]));
    const states = Object.fromEntries(questions.map((q) => [q.id, questionState(byQuestion.get(q.id), q)]));

    if (body.action === "state") return NextResponse.json({ attempt, questions: states });

    // submit
    if (questions.some((q) => states[q.id].status === "open")) {
      return apiError(409, "Finish every question to see your result.");
    }
    const feedback: QuestionFeedback[] = questions.map((q) => {
      const st = states[q.id];
      const solved = st.status === "solved";
      return {
        questionId: q.id,
        correct: solved,
        explanation: solved ? `Correct — ${q.explanation}` : `Not quite. ${q.explanation} (Correct answer: "${q.correctAnswer}")`,
        attempts: st.tries,
        solved,
        answer: q.correctAnswer,
        note: q.explanation,
      };
    });
    const answers = Object.fromEntries(
      questions.map((q) => [q.id, states[q.id].status === "solved" ? q.correctAnswer : (states[q.id].wrong.at(-1) ?? "")]),
    );
    const correctCount = feedback.filter((f) => f.correct).length;
    const score = feedback.length ? Math.round((correctCount / feedback.length) * 100) : 0;
    const submission: Submission = {
      id: `sub_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      userId,
      assignmentId: a.id,
      courseId: a.course_id,
      answers,
      score,
      passed: score >= PASS_MARK,
      feedback,
      attemptNumber: attempt,
      submittedAt: new Date().toISOString(),
    };
    const ins = await sb.from("submissions").insert({
      id: submission.id, user_id: userId, assignment_id: a.id, course_id: a.course_id, answers, score,
      passed: submission.passed, feedback, attempt_number: attempt, submitted_at: submission.submittedAt,
    });
    if (ins.error) throw ins.error;
    // Answering a checkpoint can finish the topic, which banks its credit.
    const credits = await refreshTopicCredit(sb, userId, a.course_id);
    return NextResponse.json({ submission, credits });
  } catch (e) {
    logError(`leap/checkpoint:${body.action}`, e);
    const missingTable = /checkpoint_progress/.test(String((e as { message?: string })?.message ?? ""));
    return apiError(missingTable ? 503 : 500, missingTable ? "Checkpoints need the 2026-11-05 database update." : "Something went wrong. Please try again.");
  }
}
