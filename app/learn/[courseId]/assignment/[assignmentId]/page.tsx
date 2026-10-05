"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Lightbulb, Loader2, RotateCcw, Star, X } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { AppShell } from "@/components/app/AppShell";
import { Bar, PageHead, V2Card, v2Button } from "@/components/v2/ui";
import { useApp } from "@/lib/store/AppProvider";
import { TOPIC_CREDIT_MAX } from "@/lib/credits";
import { fetchHint } from "@/lib/hint";
import { cn } from "@/lib/utils";
import { Assignment, Course, Question, Submission, Video } from "@/lib/types";

const MAX_ATTEMPTS = 10; // whole-assignment retries (kept for unlock-gating compatibility)
const MAX_Q_ATTEMPTS = 4; // per-question tries before the answer is revealed

const CHIP = "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold leading-[18px]";
const GOOD = "bg-lv-orgs-tint text-lv-orgs-dark";
const BAD = "bg-lv-people-tint text-lv-people-dark";

export default function AssignmentPage() {
  return (
    <AppShell signedOutTo="/login">
      <AssignmentGate />
    </AppShell>
  );
}

function TopicNotFound() {
  return (
    <div className="py-20 text-center">
      <p className="font-heading text-xl font-semibold text-heading">Topic not found</p>
      <Link href="/my-topics" className={v2Button("primary", "md", "mt-5")}>
        Back to my topics
      </Link>
    </div>
  );
}

/** Sends the learner back to the topic page unless this checkpoint is open to them. */
function AssignmentGate() {
  const params = useParams<{ courseId: string; assignmentId: string }>();
  const router = useRouter();
  const { getCourse, isEnrolled, hasAccess, assignmentUnlocked } = useApp();

  const course = getCourse(params.courseId);
  const assignment = course?.assignments.find((a) => a.id === params.assignmentId);

  React.useEffect(() => {
    if (!course) return;
    if (!assignment || !isEnrolled(course.id) || !hasAccess(course.id) || !assignmentUnlocked(assignment.id)) {
      router.replace(`/courses/${course.slug}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, assignment?.id]);

  if (!course) return <TopicNotFound />;
  if (!assignment || !isEnrolled(course.id) || !hasAccess(course.id) || !assignmentUnlocked(assignment.id)) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
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
  const total = assignment.questions.length;

  return (
    <div className="space-y-6">
      {/* ── Where you are ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link href={`/courses/${course.slug}`} className="group inline-flex min-w-0 items-center gap-2 font-semibold text-heading">
            <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-200 ease-out-expo group-hover:-translate-x-1" />
            <span className="truncate">{course.title}</span>
          </Link>
          <span className="shrink-0 font-medium text-muted">· Checkpoint after video {assignment.afterVideoOrder}</span>
        </div>
        <span className={cn(CHIP, "border border-hair bg-card text-heading")}>
          Attempt {Math.min(result ? result.attemptNumber : prior.attempts + 1, MAX_ATTEMPTS)} of {MAX_ATTEMPTS}
        </span>
      </div>

      <PageHead
        title="AI-graded assignment"
        description={`A wrong answer gets a hint from your LEAP AI tutor. You have up to ${MAX_Q_ATTEMPTS} tries per question.`}
        actions={
          !result && (
            <div className="w-[220px]">
              <p className="text-[13px] font-semibold leading-5 text-heading">
                {resolvedCount} of {total} done
              </p>
              <Bar pct={total ? (resolvedCount / total) * 100 : 0} className="mt-1.5" fillClass="bg-lv-orgs" />
            </div>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_416px] lg:items-start">
        <div className="min-w-0">
          {result ? (
            <ResultView assignment={assignment} result={result} exhausted={exhausted} nextHref={nextHref} onRetry={retry} />
          ) : (
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

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <p className="text-[13px] font-medium text-muted">
                  {allResolved ? "Every question is done." : "Finish every question to see your result."}
                </p>
                <button type="button" onClick={finish} disabled={!allResolved} className={v2Button("strong")}>
                  See my results <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-6">
          <V2Card className="p-6">
            <h2 className="font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">How this works</h2>
            <div className="mt-4 space-y-4">
              {[
                [String(MAX_Q_ATTEMPTS), "tries per question", "A hint comes after each wrong answer."],
                ["60%", "pass mark", "Passing unlocks the next videos."],
                [String(MAX_ATTEMPTS), "attempts at the checkpoint", "After the last one the videos unlock anyway."],
              ].map(([value, label, note]) => (
                <div key={label} className="flex items-center gap-3.5">
                  <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] bg-v2-gold-soft font-heading text-lg font-bold tracking-[-0.015em] text-v2-gold-text">
                    {value}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-heading">{label}</p>
                    <p className="text-xs font-medium text-muted">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </V2Card>

          <V2Card className="p-6">
            <h2 className="flex items-center gap-2.5 font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">
              <Star className="h-[18px] w-[18px] fill-gold-400 text-gold-600" /> What this is worth
            </h2>
            <p className="mt-2.5 text-sm leading-5 text-v2-body">
              Each finished topic earns up to {TOPIC_CREDIT_MAX} learning credits. Solving questions in your first one or two tries earns more.
            </p>
          </V2Card>
        </aside>
      </div>
    </div>
  );
}

const OPTION = "flex w-full items-center gap-2.5 rounded-[14px] border px-3.5 py-3 text-left text-sm leading-5 transition-colors duration-200";
const RADIO = "grid h-5 w-5 shrink-0 place-items-center rounded-full";
const WORD = "rounded-full border px-4 py-2 text-sm font-semibold leading-5 transition-colors duration-200";

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
  // Short choices sit two to a row; longer ones get a full row each.
  const twoColumns = q.options.every((o) => o.length <= 22);
  const triesLeft = MAX_Q_ATTEMPTS - st.attempts;

  return (
    <V2Card className="space-y-4 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn(CHIP, "bg-surface text-v2-body")}>Question {index + 1}</span>
        {st.status === "solved" ? (
          <span className={cn(CHIP, GOOD)}>
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            {st.attempts <= 1 ? "Solved on the first try" : `Solved in ${st.attempts} tries`}
          </span>
        ) : st.status === "revealed" ? (
          <span className={cn(CHIP, BAD)}>Answer shown after {MAX_Q_ATTEMPTS} tries</span>
        ) : st.attempts > 0 ? (
          <span className={cn(CHIP, "bg-v2-gold-soft text-v2-gold-text")}>
            Try {st.attempts + 1} of {MAX_Q_ATTEMPTS}
          </span>
        ) : (
          q.type === "fill_blank" && <span className={cn(CHIP, "bg-surface text-v2-body")}>Fill in the blank</span>
        )}
      </div>

      <p className="font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">
        {q.type === "fill_blank"
          ? q.prompt.split("____").map((part, idx, arr) => (
              <React.Fragment key={idx}>
                {part}
                {idx < arr.length - 1 && (
                  <span className="mx-1 inline-block min-w-[72px] border-b-2 border-heading px-1 text-center text-v2-gold-text">
                    {blankValue === "?" ? "\u00a0" : blankValue}
                  </span>
                )}
              </React.Fragment>
            ))
          : q.prompt}
      </p>

      <div className={q.type === "mcq" ? cn("grid gap-2", twoColumns && "sm:grid-cols-2") : "flex flex-wrap gap-2"}>
        {q.options.map((opt) => {
          const selected = st.picked === opt;
          const isWrong = st.wrong.includes(opt);
          const showCorrect = !isOpen && isCorrectOpt(opt);
          const disabled = !isOpen || isWrong;

          if (q.type === "mcq") {
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onPick(opt)}
                disabled={disabled}
                className={cn(
                  OPTION,
                  showCorrect
                    ? "border-lv-orgs bg-lv-orgs-tint font-semibold text-heading ring-1 ring-lv-orgs"
                    : isWrong
                      ? "border-lv-people bg-lv-people-tint font-semibold text-muted"
                      : selected
                        ? "border-v2-strong bg-card font-semibold text-heading ring-1 ring-v2-strong"
                        : cn("border-v2-line-strong bg-card font-medium text-heading", isOpen && "hover:border-heading"),
                )}
              >
                <span
                  className={cn(
                    RADIO,
                    showCorrect
                      ? "bg-lv-orgs text-white"
                      : isWrong
                        ? "bg-lv-people text-white"
                        : selected
                          ? "bg-v2-strong"
                          : "border-[1.5px] border-v2-line-strong",
                  )}
                >
                  {showCorrect ? (
                    <Check className="h-3 w-3" strokeWidth={3.5} />
                  ) : isWrong ? (
                    <X className="h-3 w-3" strokeWidth={3.5} />
                  ) : (
                    selected && <span className="h-2 w-2 rounded-full bg-v2-on-strong" />
                  )}
                </span>
                <span className="min-w-0 flex-1">{opt}</span>
                {isWrong && <span className="shrink-0 text-xs font-semibold text-lv-people-dark">Tried</span>}
              </button>
            );
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onPick(opt)}
              disabled={disabled}
              className={cn(
                WORD,
                showCorrect
                  ? "border-lv-orgs bg-lv-orgs text-white"
                  : isWrong
                    ? "border-lv-people bg-lv-people-tint text-lv-people-dark line-through"
                    : selected
                      ? "border-v2-strong bg-v2-strong text-v2-on-strong"
                      : cn("border-v2-line-strong bg-card text-heading", isOpen && "hover:border-heading"),
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* status / actions */}
      {isOpen ? (
        <>
          {st.hintLoading && (
            <div className="flex items-center gap-2.5 rounded-[14px] bg-surface p-3.5 text-sm font-medium text-v2-body">
              <Loader2 className="h-4 w-4 animate-spin text-v2-gold-text" /> Your LEAP tutor is thinking of a hint…
            </div>
          )}
          {st.hint && !st.hintLoading && (
            <div className="flex items-center gap-3 rounded-[14px] bg-v2-gold-soft p-3.5">
              <LogoMark className="h-8 w-8" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-semibold leading-[18px] text-v2-gold-text">
                  <Lightbulb className="h-3.5 w-3.5" /> Hint from your LEAP tutor
                </p>
                <p className="text-sm font-medium leading-5 text-heading">{st.hint}</p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {st.attempts > 0 ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                {Array.from({ length: MAX_Q_ATTEMPTS }, (_, i) => (
                  <span key={i} className={cn("h-2.5 w-2.5 rounded-full", i < st.attempts ? "bg-lv-people" : "bg-surface-2")} />
                ))}
                <span className="ml-1.5">
                  {triesLeft} {triesLeft === 1 ? "try" : "tries"} left
                </span>
              </span>
            ) : (
              <span className="text-xs font-medium text-muted">
                {q.type === "fill_blank" ? "Pick a word from the bank" : `${MAX_Q_ATTEMPTS} tries, with a hint each time`}
              </span>
            )}
            <button
              type="button"
              onClick={onCheck}
              disabled={!st.picked || st.hintLoading}
              className={v2Button(st.picked ? "primary" : "outline")}
            >
              Check answer
            </button>
          </div>
        </>
      ) : (
        q.explanation && <p className="rounded-[14px] bg-surface p-3.5 text-sm leading-5 text-v2-body">{q.explanation}</p>
      )}
    </V2Card>
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
    <div className="space-y-5">
      <V2Card className="p-8 text-center">
        <span className={cn("mx-auto grid h-14 w-14 place-items-center rounded-full", passed ? GOOD : "bg-v2-gold-soft text-v2-gold-text")}>
          {passed ? <Check className="h-7 w-7" strokeWidth={3} /> : <RotateCcw className="h-7 w-7" />}
        </span>
        <p className="mt-4 font-heading text-5xl font-bold tracking-[-0.015em] text-heading">{result.score}%</p>
        <p className="mt-2 font-heading text-xl font-semibold tracking-[-0.015em] text-heading">
          {passed ? "Checkpoint passed! 🎉" : exhausted ? "Videos unlocked" : "Almost there"}
        </p>
        <p className="mx-auto mt-1.5 max-w-xl text-[15px] leading-6 text-v2-body">
          {passed
            ? `Great work. The next videos are now unlocked, and you nailed ${firstTwo} of ${assignment.questions.length} within two tries.`
            : exhausted
              ? "You've used all attempts, so the next videos are unlocked. Review the feedback below."
              : `You need 60% to pass. Review the feedback and try again (attempt ${result.attemptNumber}/${MAX_ATTEMPTS}).`}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {passed || exhausted ? (
            <Link href={nextHref} className={v2Button("primary")}>
              Continue learning <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button type="button" onClick={onRetry} className={v2Button("primary")}>
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
          )}
        </div>
      </V2Card>

      <h2 className="pt-2 font-heading text-xl font-semibold leading-[25px] tracking-[-0.015em] text-heading">Question breakdown</h2>
      {assignment.questions.map((q, i) => {
        const fb = result.feedback.find((f) => f.questionId === q.id);
        const correct = fb?.correct;
        const tries = fb?.attempts;
        return (
          <V2Card key={q.id} className="flex items-start gap-3.5 p-6">
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-white", correct ? "bg-lv-orgs" : "bg-lv-people")}>
              {correct ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[15px] font-semibold leading-6 text-heading">
                  {i + 1}. {q.prompt.replace("____", "______")}
                </p>
                {tries != null && (
                  <span className={cn(CHIP, correct ? GOOD : BAD)}>{correct ? (tries <= 1 ? "1st try" : `${tries} tries`) : "revealed"}</span>
                )}
              </div>
              <p className="text-sm leading-5">
                <span className="text-muted">Correct answer: </span>
                <span className="font-semibold text-lv-orgs-dark">{q.correctAnswer}</span>
              </p>
              {q.explanation && <p className="rounded-[14px] bg-surface p-3.5 text-sm leading-5 text-v2-body">{q.explanation}</p>}
            </div>
          </V2Card>
        );
      })}
    </div>
  );
}
