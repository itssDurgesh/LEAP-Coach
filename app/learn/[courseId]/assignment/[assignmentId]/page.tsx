"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  ClipboardCheck,
  Sparkles,
  Check,
  Lightbulb,
  Eye,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useApp } from "@/lib/store/AppProvider";
import { useRequireLearner } from "@/components/app/guards";
import { fetchHint } from "@/lib/hint";
import { cn } from "@/lib/utils";
import { Assignment, Course, Question, Submission, Video } from "@/lib/types";

const MAX_ATTEMPTS = 10; // whole-assignment retries (kept for unlock-gating compatibility)
const MAX_Q_ATTEMPTS = 4; // per-question tries before the answer is revealed

export default function AssignmentPage() {
  const { ready } = useRequireLearner();
  const params = useParams<{ courseId: string; assignmentId: string }>();
  const router = useRouter();
  const { getCourse, isEnrolled, assignmentUnlocked } = useApp();

  const course = getCourse(params.courseId);
  const assignment = course?.assignments.find((a) => a.id === params.assignmentId);

  React.useEffect(() => {
    if (!ready || !course) return;
    if (!assignment || !isEnrolled(course.id) || !assignmentUnlocked(assignment.id)) {
      router.replace(`/courses/${course.slug}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, course?.id, assignment?.id]);

  if (!ready || !course || !assignment || !assignmentUnlocked(assignment.id)) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
      </div>
    );
  }

  return <AssignmentRunner course={course} assignment={assignment} />;
}

// ── per-question interactive state ──
type QStatus = "open" | "solved" | "revealed";
interface QState {
  picked?: string; // pending selection before "Check"
  attempts: number; // checks made so far (0..MAX_Q_ATTEMPTS)
  status: QStatus;
  hint: string | null;
  hintLoading: boolean;
  wrong: string[]; // options tried and found wrong
}

function initQState(a: Assignment): Record<string, QState> {
  const m: Record<string, QState> = {};
  for (const q of a.questions) m[q.id] = { attempts: 0, status: "open", hint: null, hintLoading: false, wrong: [] };
  return m;
}

function AssignmentRunner({ course, assignment }: { course: Course; assignment: Assignment }) {
  const { submitAssignment, assignmentResult } = useApp();
  const prior = assignmentResult(assignment.id);

  const [qstate, setQState] = React.useState<Record<string, QState>>(() => initQState(assignment));
  const [result, setResult] = React.useState<Submission | null>(null);

  const gateVideo = course.videos.find((v) => v.order === assignment.afterVideoOrder);
  const nextVideo = course.videos.find((v) => v.order === assignment.afterVideoOrder + 1);
  const nextHref = nextVideo ? `/learn/${course.id}/${nextVideo.order}` : `/courses/${course.slug}`;

  const setQ = (qid: string, patch: Partial<QState>) =>
    setQState((s) => ({ ...s, [qid]: { ...s[qid], ...patch } }));

  const resolvedCount = assignment.questions.filter((q) => qstate[q.id].status !== "open").length;
  const allResolved = resolvedCount === assignment.questions.length;

  function pick(qid: string, opt: string) {
    const st = qstate[qid];
    if (st.status !== "open" || st.wrong.includes(opt)) return;
    setQ(qid, { picked: opt });
  }

  async function check(q: Question, gate?: Video) {
    const st = qstate[q.id];
    if (st.status !== "open" || !st.picked) return;
    const picked = st.picked;
    const correct = picked.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    const attempts = st.attempts + 1;

    if (correct) {
      setQ(q.id, { status: "solved", attempts, hint: null, hintLoading: false });
      return;
    }
    const wrong = st.wrong.includes(picked) ? st.wrong : [...st.wrong, picked];
    if (attempts >= MAX_Q_ATTEMPTS) {
      // Out of tries → reveal the answer (highlighted in the options).
      setQ(q.id, { status: "revealed", attempts, wrong, picked: undefined, hint: null, hintLoading: false });
      return;
    }
    // Wrong, tries remain → fetch a non-revealing hint.
    setQ(q.id, { attempts, wrong, picked: undefined, hintLoading: true, hint: null });
    const hint = await fetchHint({
      courseTitle: course.title,
      video: { title: gate?.title ?? course.title, summary: gate?.summary ?? "" },
      question: q,
      wrongAnswer: picked,
      attempt: attempts,
    });
    setQ(q.id, { hint, hintLoading: false });
  }

  function finish() {
    const answers: Record<string, string> = {};
    const attempts: Record<string, number> = {};
    for (const q of assignment.questions) {
      const st = qstate[q.id];
      attempts[q.id] = st.attempts;
      // Solved → record the correct answer; revealed (unsolved) → record their last wrong pick.
      answers[q.id] = st.status === "solved" ? q.correctAnswer : st.wrong[st.wrong.length - 1] ?? "";
    }
    const sub = submitAssignment(assignment.id, answers, attempts);
    setResult(sub);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function retry() {
    setQState(initQState(assignment));
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const exhausted = (result?.attemptNumber ?? prior.attempts) >= MAX_ATTEMPTS;

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b border-hair bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-heading"
          >
            <X className="h-5 w-5" /> Exit
          </Link>
          <p className="truncate text-sm font-semibold text-heading">{course.title}</p>
          <Logo href="/dashboard" size="sm" className="hidden sm:inline-flex" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {result ? (
          <ResultView
            assignment={assignment}
            result={result}
            exhausted={exhausted}
            nextHref={nextHref}
            onRetry={retry}
          />
        ) : (
          <>
            <div className="mb-6">
              <Badge variant="navy">
                <ClipboardCheck className="h-3.5 w-3.5" /> Checkpoint · after video {assignment.afterVideoOrder}
              </Badge>
              <h1 className="mt-3 font-heading text-3xl font-bold text-heading">AI-Graded Assignment</h1>
              <p className="mt-2 text-muted">
                Answer each question. A wrong answer gets a hint from your LEAP AI tutor — you have up to{" "}
                {MAX_Q_ATTEMPTS} tries before the answer is shown. Getting it in your first one or two tries lifts
                your topic rating. {prior.attempts > 0 && `Attempt ${prior.attempts + 1} of ${MAX_ATTEMPTS}.`}
              </p>
            </div>

            <div className="space-y-5">
              {assignment.questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  index={i}
                  question={q}
                  state={qstate[q.id]}
                  onPick={(opt) => pick(q.id, opt)}
                  onCheck={() => check(q, gateVideo)}
                />
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-sm text-muted">
                {resolvedCount}/{assignment.questions.length} resolved
              </p>
              <Button size="lg" onClick={finish} disabled={!allResolved}>
                <Sparkles className="h-4 w-4" /> See my results
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function QuestionCard({
  index,
  question: q,
  state: st,
  onPick,
  onCheck,
}: {
  index: number;
  question: Question;
  state: QState;
  onPick: (opt: string) => void;
  onCheck: () => void;
}) {
  const isOpen = st.status === "open";
  const isCorrectOpt = (opt: string) => opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
  const blankValue = st.status === "open" ? st.picked || "?" : q.correctAnswer;

  return (
    <Card padded>
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-800 text-sm font-bold text-white">
          {index + 1}
        </span>
        <div className="flex-1">
          <Badge variant="neutral" className="mb-2">
            {q.type === "mcq" ? "Multiple choice" : "Fill in the blank"}
          </Badge>
          {q.type === "fill_blank" ? (
            <p className="font-heading text-lg font-semibold leading-relaxed text-heading">
              {q.prompt.split("____").map((part, idx, arr) => (
                <React.Fragment key={idx}>
                  {part}
                  {idx < arr.length - 1 && (
                    <span className="mx-1 inline-block min-w-[80px] rounded-md border-b-2 border-gold-400 bg-gold-50 px-2 text-center text-gold-700 dark:bg-gold-500/10">
                      {blankValue}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </p>
          ) : (
            <p className="font-heading text-lg font-semibold leading-relaxed text-heading">{q.prompt}</p>
          )}

          <div className={cn("mt-4 gap-2.5", q.type === "mcq" ? "grid" : "flex flex-wrap")}>
            {q.options.map((opt) => {
              const selected = st.picked === opt;
              const isWrong = st.wrong.includes(opt);
              const showCorrect = (st.status === "solved" || st.status === "revealed") && isCorrectOpt(opt);
              const disabled = !isOpen || isWrong;

              if (q.type === "mcq") {
                return (
                  <button
                    key={opt}
                    onClick={() => onPick(opt)}
                    disabled={disabled}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors",
                      showCorrect
                        ? "border-green-400 bg-green-50 text-heading dark:bg-green-500/10"
                        : isWrong
                          ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10"
                          : selected
                            ? "border-gold-400 bg-gold-50 text-heading dark:bg-gold-500/10"
                            : "border-hair text-heading hover:border-faint disabled:opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                        showCorrect
                          ? "border-green-500 bg-green-500 text-white"
                          : isWrong
                            ? "border-red-400 bg-red-400 text-white"
                            : selected
                              ? "border-gold-500 bg-gold-500 text-white"
                              : "border-hair",
                      )}
                    >
                      {showCorrect ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : isWrong ? (
                        <XCircle className="h-3 w-3" />
                      ) : selected ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : null}
                    </span>
                    {opt}
                  </button>
                );
              }
              return (
                <button
                  key={opt}
                  onClick={() => onPick(opt)}
                  disabled={disabled}
                  className={cn(
                    "rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors",
                    showCorrect
                      ? "border-green-400 bg-green-500 text-white"
                      : isWrong
                        ? "border-red-300 bg-red-100 text-red-700 line-through dark:bg-red-500/10"
                        : selected
                          ? "border-gold-400 bg-gold-500 text-navy-900"
                          : "border-hair bg-card text-heading hover:border-gold-300 disabled:opacity-60",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* status / actions */}
          {isOpen ? (
            <div className="mt-4 space-y-3">
              {st.hintLoading && (
                <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-gold-600" /> Your LEAP tutor is thinking of a hint…
                </div>
              )}
              {st.hint && !st.hintLoading && (
                <div className="flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-50 px-3.5 py-2.5 text-sm text-heading dark:bg-gold-500/10">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                  <span>{st.hint}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-faint">
                  {st.attempts > 0
                    ? `Attempt ${st.attempts + 1} of ${MAX_Q_ATTEMPTS}`
                    : `${MAX_Q_ATTEMPTS} tries, with a hint each time`}
                </span>
                <Button size="sm" onClick={onCheck} disabled={!st.picked || st.hintLoading}>
                  Check answer
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {st.status === "solved" ? (
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {st.attempts <= 1 ? "Correct on the first try! 🎉" : `Correct — solved in ${st.attempts} tries.`}
                </p>
              ) : (
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600">
                  <Eye className="h-4 w-4" /> Answer revealed after {MAX_Q_ATTEMPTS} tries — highlighted above.
                </p>
              )}
              <div className="flex items-start gap-2 rounded-xl bg-surface p-3 text-sm text-muted">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                <span>{q.explanation}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ResultView({
  assignment,
  result,
  exhausted,
  nextHref,
  onRetry,
}: {
  assignment: Assignment;
  result: Submission;
  exhausted: boolean;
  nextHref: string;
  onRetry: () => void;
}) {
  const passed = result.passed;
  const firstTwo = result.feedback.filter((f) => f.solved && (f.attempts ?? 99) <= 2).length;

  return (
    <div>
      <Card
        className={cn(
          "relative overflow-hidden p-8 text-center",
          passed
            ? "bg-gradient-to-br from-green-50 to-cream-50 dark:from-green-500/10 dark:to-transparent"
            : "bg-gradient-to-br from-orange-50 to-cream-50 dark:from-orange-500/10 dark:to-transparent",
        )}
      >
        <div
          className={cn(
            "mx-auto grid h-16 w-16 place-items-center rounded-full",
            passed ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600",
          )}
        >
          {passed ? <CheckCircle2 className="h-9 w-9" /> : <RotateCcw className="h-9 w-9" />}
        </div>
        <p className="mt-4 font-heading text-5xl font-bold text-heading">{result.score}%</p>
        <p className="mt-2 font-heading text-xl font-semibold text-heading">
          {passed ? "Checkpoint passed! 🎉" : exhausted ? "Videos unlocked" : "Almost there"}
        </p>
        <p className="mt-1 text-muted">
          {passed
            ? `Great work — the next videos are now unlocked. You nailed ${firstTwo} of ${assignment.questions.length} within two tries.`
            : exhausted
              ? "You've used all attempts, so the next videos are unlocked. Review the feedback below."
              : `You need 60% to pass. Review the feedback and try again (attempt ${result.attemptNumber}/${MAX_ATTEMPTS}).`}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {passed || exhausted ? (
            <Link href={nextHref} className={buttonClasses({ variant: "primary", size: "lg" })}>
              Continue learning <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Button size="lg" onClick={onRetry}>
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
          )}
        </div>
      </Card>

      <h2 className="mb-3 mt-8 font-heading text-xl font-bold text-heading">Question breakdown</h2>
      <div className="space-y-4">
        {assignment.questions.map((q, i) => {
          const fb = result.feedback.find((f) => f.questionId === q.id);
          const correct = fb?.correct;
          const tries = fb?.attempts;
          return (
            <Card key={q.id} padded className={cn("border-l-4", correct ? "border-l-green-500" : "border-l-red-400")}>
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
                    correct ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600",
                  )}
                >
                  {correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </span>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-heading">
                      {i + 1}. {q.prompt.replace("____", "______")}
                    </p>
                    {tries != null && (
                      <Badge variant={correct ? "success" : "neutral"} className="shrink-0">
                        {correct ? (tries <= 1 ? "1st try" : `${tries} tries`) : "revealed"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm">
                    <span className="text-faint">Correct answer: </span>
                    <span className="font-medium text-green-700">{q.correctAnswer}</span>
                  </p>
                  <div className="mt-2 flex items-start gap-2 rounded-xl bg-surface p-3 text-sm text-muted">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                    <span>{q.explanation}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
