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
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useApp } from "@/lib/store/AppProvider";
import { useRequireLearner } from "@/components/app/guards";
import { cn } from "@/lib/utils";
import { Assignment, Course, Submission } from "@/lib/types";

const MAX_ATTEMPTS = 10;

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

function AssignmentRunner({ course, assignment }: { course: Course; assignment: Assignment }) {
  const { submitAssignment, assignmentResult } = useApp();
  const prior = assignmentResult(assignment.id);

  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<Submission | null>(null);

  const allAnswered = assignment.questions.every((q) => answers[q.id]);
  const nextVideo = course.videos.find((v) => v.order === assignment.afterVideoOrder + 1);
  const nextHref = nextVideo ? `/learn/${course.id}/${nextVideo.order}` : `/courses/${course.slug}`;

  function setAnswer(qid: string, val: string) {
    setAnswers((a) => ({ ...a, [qid]: val }));
  }

  function submit() {
    const sub = submitAssignment(assignment.id, answers);
    setResult(sub);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function retry() {
    setAnswers({});
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
            answers={answers}
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
                Answer all {assignment.questions.length} questions. You need 60% to pass and unlock the
                next videos. {prior.attempts > 0 && `Attempt ${prior.attempts + 1} of ${MAX_ATTEMPTS}.`}
              </p>
            </div>

            <div className="space-y-5">
              {assignment.questions.map((q, i) => (
                <Card key={q.id} padded>
                  <div className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-800 text-sm font-bold text-white">
                      {i + 1}
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
                                <span className="mx-1 inline-block min-w-[80px] rounded-md border-b-2 border-gold-400 bg-gold-50 px-2 text-center text-gold-700">
                                  {answers[q.id] || "?"}
                                </span>
                              )}
                            </React.Fragment>
                          ))}
                        </p>
                      ) : (
                        <p className="font-heading text-lg font-semibold leading-relaxed text-heading">
                          {q.prompt}
                        </p>
                      )}

                      <div className={cn("mt-4 gap-2.5", q.type === "mcq" ? "grid" : "flex flex-wrap")}>
                        {q.options.map((opt) => {
                          const selected = answers[q.id] === opt;
                          if (q.type === "mcq") {
                            return (
                              <button
                                key={opt}
                                onClick={() => setAnswer(q.id, opt)}
                                className={cn(
                                  "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors",
                                  selected
                                    ? "border-gold-400 bg-gold-50 dark:bg-gold-500/10 text-heading"
                                    : "border-hair text-heading hover:border-faint",
                                )}
                              >
                                <span
                                  className={cn(
                                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                                    selected ? "border-gold-500 bg-gold-500 text-white" : "border-hair",
                                  )}
                                >
                                  {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                                </span>
                                {opt}
                              </button>
                            );
                          }
                          return (
                            <button
                              key={opt}
                              onClick={() => setAnswer(q.id, opt)}
                              className={cn(
                                "rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors",
                                selected
                                  ? "border-gold-400 bg-gold-500 text-navy-900"
                                  : "border-hair bg-card text-heading hover:border-gold-300",
                              )}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-sm text-muted">
                {Object.keys(answers).length}/{assignment.questions.length} answered
              </p>
              <Button size="lg" onClick={submit} disabled={!allAnswered}>
                <Sparkles className="h-4 w-4" /> Submit for AI grading
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ResultView({
  assignment,
  result,
  answers,
  exhausted,
  nextHref,
  onRetry,
}: {
  assignment: Assignment;
  result: Submission;
  answers: Record<string, string>;
  exhausted: boolean;
  nextHref: string;
  onRetry: () => void;
}) {
  const passed = result.passed;
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
            ? "Great work — the next videos are now unlocked."
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
          const given = answers[q.id];
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
                  <p className="font-medium text-heading">
                    {i + 1}. {q.prompt.replace("____", "______")}
                  </p>
                  <p className="mt-1.5 text-sm">
                    <span className="text-faint">Your answer: </span>
                    <span className={cn("font-medium", correct ? "text-green-700" : "text-red-600")}>
                      {given || "—"}
                    </span>
                  </p>
                  <div className="mt-2 flex items-start gap-2 rounded-xl bg-surface p-3 text-sm text-muted">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                    <span>{fb?.explanation}</span>
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
