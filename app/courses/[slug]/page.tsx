"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  Clock,
  Users,
  PlayCircle,
  CheckCircle2,
  Lock,
  ClipboardCheck,
  BookOpen,
  Award,
  Check,
  ArrowRight,
  FileText,
  Download,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CourseThumb } from "@/components/CourseThumb";
import { CourseCard } from "@/components/CourseCard";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useApp } from "@/lib/store/AppProvider";
import { courseCategories } from "@/lib/types";
import { buildTopicReport } from "@/lib/report";
import { topicCredit, TOPIC_CREDIT_MAX } from "@/lib/credits";
import { downloadNotesPdf } from "@/lib/pdf";
import { cn, formatINR, formatDuration, formatClock } from "@/lib/utils";

export default function CourseDetailPage() {
  return (
    <AppShell>
      <CourseDetail />
    </AppShell>
  );
}

function CourseDetail() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const {
    currentUser,
    courses,
    getCourseBySlug,
    isEnrolled,
    hasAccess,
    courseExpiresAt,
    enrollFree,
    isVideoCompleted,
    isVideoUnlocked,
    courseProgress,
    assignmentUnlocked,
    assignmentResult,
    submissions,
    progress,
    enrollments,
    notesForCourse,
  } = useApp();

  const [checkout, setCheckout] = React.useState(false);
  const course = getCourseBySlug(params.slug);

  if (!course) {
    return (
      <div className="py-20 text-center">
        <p className="font-heading text-xl font-bold text-heading">Topic not found</p>
        <Link href="/courses" className={buttonClasses({ variant: "primary", size: "md", className: "mt-5" })}>
          Back to catalog
        </Link>
      </div>
    );
  }

  const enrolled = isEnrolled(course.id);
  const access = hasAccess(course.id);
  const prog = courseProgress(course.id);
  const duration = course.videos.reduce((s, v) => s + v.durationSeconds, 0);
  const resumeOrder = course.videos.find((v) => !isVideoCompleted(v.id))?.order ?? 1;

  // Access to a paid topic lapses one year after purchase (computed per entitlement —
  // à-la-carte topic, catalog pass, or all-access — whichever runs longest). When it
  // lapses the learner re-purchases to unlock another year; there's no free renewal.
  const expiresAt = courseExpiresAt(course.id);
  const expired = !!expiresAt && Date.parse(expiresAt) < Date.now();
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const enrollment = enrollments.find((e) => e.userId === currentUser?.id && e.courseId === course.id);
  const report = currentUser ? buildTopicReport(course, currentUser.id, submissions, progress, enrollment) : null;
  const earnedCredit = currentUser ? topicCredit(course, currentUser.id, submissions).credit : 0;
  const myNotes = currentUser ? notesForCourse(course.id) : [];

  function handleEnroll() {
    if (!currentUser) return;
    if (course!.price === 0 || access) {
      enrollFree(course!.id);
    } else {
      setCheckout(true);
    }
  }

  const recommended = courses
    .filter(
      (c) =>
        c.published &&
        c.id !== course.id &&
        (c.hashtags.some((h) => course.hashtags.includes(h)) ||
          courseCategories(c).some((x) => courseCategories(course).includes(x))),
    )
    .slice(0, 3);

  // Build interleaved syllabus rows (videos + assignment checkpoints)
  const rows: Array<
    | { kind: "video"; order: number }
    | { kind: "assignment"; id: string; afterVideoOrder: number }
  > = [];
  course.videos
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((v) => {
      rows.push({ kind: "video", order: v.order });
      const a = course.assignments.find((x) => x.afterVideoOrder === v.order);
      if (a) rows.push({ kind: "assignment", id: a.id, afterVideoOrder: a.afterVideoOrder });
    });

  return (
    <div className="space-y-10">
      <Link
        href="/courses"
        className="group inline-flex items-center gap-2 font-heading text-sm font-semibold text-muted transition-colors duration-200 hover:text-heading"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:-translate-x-1" />
        Back to catalog
      </Link>

      {/* ── Hero ── */}
      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="navy" className="capitalize">{course.category}</Badge>
            <Badge variant="neutral">{course.level}</Badge>
            {course.trending && <Badge variant="trending">Trending</Badge>}
            {enrolled && <Badge variant="success"><Check className="h-3 w-3" strokeWidth={3} /> Enrolled</Badge>}
          </div>

          <h1 className="mt-4 text-balance font-heading text-display-sm font-bold leading-tight text-heading">
            {course.title}
          </h1>
          <p className="mt-4 max-w-2xl leading-[1.75] text-muted">{course.description}</p>

          {/* Meta as a ruled row */}
          <div className="mt-6 grid grid-cols-2 gap-y-5 border-y border-hair py-5 sm:grid-cols-4">
            {[
              {
                label: "Rating",
                value: course.rating.toFixed(1),
                sub: `${course.ratingCount} ratings`,
                icon: Star,
              },
              {
                label: "Enrolled",
                value: course.enrolledCount.toLocaleString("en-IN"),
                sub: "learners",
                icon: Users,
              },
              { label: "Duration", value: formatDuration(duration), sub: "total", icon: Clock },
              {
                label: "Lessons",
                value: String(course.videos.length),
                sub: `${course.assignments.length} checkpoints`,
                icon: BookOpen,
              },
            ].map((m) => (
              <div
                key={m.label}
                className="border-l border-hair pl-4 [&:nth-child(2n+1)]:border-l-0 [&:nth-child(2n+1)]:pl-0 sm:pl-5 sm:[&:nth-child(2n+1)]:border-l sm:[&:nth-child(2n+1)]:pl-5 sm:[&:nth-child(4n+1)]:border-l-0 sm:[&:nth-child(4n+1)]:pl-0"
              >
                <m.icon className="h-4 w-4 text-gold-600" />
                <p className="mt-2 font-heading text-lg font-bold leading-none tabular-nums text-heading">
                  {m.value}
                </p>
                <p className="mt-1.5 text-xs text-faint">{m.sub}</p>
              </div>
            ))}
          </div>

          {course.hashtags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {course.hashtags.map((h) => (
                <span
                  key={h}
                  className="rounded-full border border-hair px-3 py-1 text-xs font-medium text-muted"
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3.5">
            <Avatar name={course.instructorName} size={44} />
            <div className="min-w-0">
              <p className="font-heading font-bold text-heading">{course.instructorName}</p>
              <p className="truncate text-sm text-muted">{course.instructorTitle}</p>
            </div>
          </div>
        </div>

        {/* ── Access / enroll card ── */}
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-3xl border border-hair bg-card shadow-lift">
            <CourseThumb
              accent={course.accent}
              category={course.category}
              src={course.thumbnailUrl}
              rounded="rounded-none"
              className="aspect-[16/9]"
            />
            <div className="p-6">
              {expired ? (
                <>
                  <div className="flex items-center gap-3.5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-600">
                      <Clock className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-heading font-bold text-heading">Access expired</p>
                      <p className="text-sm text-muted">Your 1-year access ended on {fmtDate(expiresAt!)}.</p>
                    </div>
                  </div>
                  <Button onClick={() => setCheckout(true)} size="lg" className="mt-5 w-full">
                    Renew · {formatINR(course.price)}
                  </Button>
                  <p className="mt-2.5 text-center text-xs text-faint">
                    Re-purchase to unlock this topic for another year.
                  </p>
                </>
              ) : enrolled ? (
                <>
                  <div className="flex items-center gap-4">
                    <ProgressRing value={prog.pct} size={72} stroke={7} />
                    <div>
                      <p className="font-heading font-bold text-heading">Your progress</p>
                      <p className="text-sm text-muted">
                        {prog.completed} of {prog.total} videos complete
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/learn/${course.id}/${resumeOrder}`}
                    className={buttonClasses({
                      variant: "primary",
                      size: "lg",
                      className: "group mt-6 w-full",
                    })}
                  >
                    {prog.completed > 0 ? "Continue learning" : "Start course"}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
                  </Link>
                  {expiresAt && (
                    <p className="mt-2.5 text-center text-xs text-faint">
                      Access valid until {fmtDate(expiresAt)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-heading text-display-sm font-bold leading-none text-heading">
                      {course.price === 0 ? "Free" : formatINR(course.price)}
                    </span>
                    {course.price > 0 && <span className="text-sm text-faint">1 year of access</span>}
                  </div>
                  {access && course.price > 0 && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-green-600">
                      <Check className="h-4 w-4" strokeWidth={3} /> Included in your All-Access Pass
                    </p>
                  )}
                  <Button onClick={handleEnroll} size="lg" className="mt-5 w-full">
                    {course.price === 0 || access ? "Enroll now" : `Enroll · ${formatINR(course.price)}`}
                  </Button>
                  <ul className="mt-6 space-y-3 border-t border-hair pt-5 text-sm text-muted">
                    {[
                      `${course.videos.length} video lessons`,
                      `${course.assignments.length} AI-graded checkpoints`,
                      "LEAP AI tutor on every video",
                      "Class notes, transcripts & resources",
                      course.price > 0 ? "1 year of access" : "Free — no expiry",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" strokeWidth={2.5} /> {f}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Performance report — shown once the learner completes the whole topic ── */}
      {enrolled && report?.completed && (
        <section className="rounded-3xl border border-gold-300 bg-gold-50 p-6 dark:border-gold-500/25 dark:bg-gold-500/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Topic completed
              </Badge>
              <h2 className="font-heading text-lg font-bold text-heading">Your performance report</h2>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn("h-4 w-4", n <= report.stars ? "fill-gold-500 text-gold-500" : "text-hair")}
                  />
                ))}
                <span className="ml-1.5 font-heading text-xs font-bold tabular-nums text-heading">
                  {report.stars}.0 / 5
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1 font-heading text-xs font-bold tabular-nums text-navy-900">
                <Award className="h-3.5 w-3.5" /> {earnedCredit} / {TOPIC_CREDIT_MAX} credits
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadNotesPdf(course, myNotes, currentUser?.name)}
              disabled={!myNotes.length}
            >
              <Download className="h-4 w-4" /> Download notes (PDF)
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Completed in",
                value:
                  report.daysToComplete === 0
                    ? "Same day"
                    : `${report.daysToComplete} day${report.daysToComplete === 1 ? "" : "s"}`,
                icon: Clock,
              },
              { label: "Average score", value: `${report.avgScore}%`, icon: Award },
              { label: "Checkpoints passed", value: `${report.checkpointsPassed}/${report.totalCheckpoints}`, icon: ClipboardCheck },
              {
                label: "Solved in ≤2 tries",
                value: report.questionsRated ? `${report.firstTwoTries}/${report.questionsRated}` : "—",
                icon: CheckCircle2,
              },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-card p-4 ring-1 ring-hair">
                <s.icon className="h-4 w-4 text-gold-600" />
                <p className="mt-2.5 font-heading text-base font-bold tabular-nums text-heading">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </div>
          {!myNotes.length && (
            <p className="mt-4 text-xs text-faint">
              Save notes while watching to export them all as a PDF here.
            </p>
          )}
        </section>
      )}

      {/* ── Syllabus / Roadmap ── */}
      <section className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="font-heading text-xl font-bold text-heading sm:text-2xl">
              {enrolled ? "Your roadmap" : "Topic syllabus"}
            </h2>
            <span className="shrink-0 text-sm tabular-nums text-faint">
              {course.videos.length} videos
            </span>
          </div>

          {enrolled && (
            <div className="mb-5 rounded-2xl border border-hair bg-card p-5">
              <div className="mb-2.5 flex items-center justify-between text-sm">
                <span className="font-medium uppercase tracking-[0.1em] text-faint">
                  Overall progress
                </span>
                <span className="font-heading font-bold tabular-nums text-heading">{prog.pct}%</span>
              </div>
              <ProgressBar value={prog.pct} size="lg" />
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-hair bg-card">
            {rows.map((row) => {
              if (row.kind === "video") {
                const video = course.videos.find((v) => v.order === row.order)!;
                const done = enrolled && isVideoCompleted(video.id);
                const open = enrolled && isVideoUnlocked(course.id, video.order);
                const clickable = done || open;
                const Tag = clickable ? Link : "div";
                return (
                  <Tag
                    // @ts-expect-error polymorphic href
                    href={clickable ? `/learn/${course.id}/${video.order}` : undefined}
                    key={video.id}
                    className={cn(
                      "group flex items-center gap-4 border-b border-hair px-5 py-4 transition-colors duration-200 last:border-0",
                      clickable ? "cursor-pointer hover:bg-surface-2" : "opacity-70",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-200",
                        done
                          ? "bg-green-100 text-green-600 dark:bg-green-500/15"
                          : open
                            ? "bg-gold-100 text-gold-700 group-hover:bg-gold-500 group-hover:text-navy-900 dark:bg-gold-500/15"
                            : "bg-surface-2 text-faint",
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : open ? (
                        <PlayCircle className="h-5 w-5" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
                        Video {video.order}
                      </p>
                      <p className="mt-0.5 truncate font-medium text-heading">{video.title}</p>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-faint">
                      {formatClock(video.durationSeconds)}
                    </span>
                  </Tag>
                );
              }

              // assignment checkpoint
              const unlocked = enrolled && assignmentUnlocked(row.id);
              const res = assignmentResult(row.id);
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-4 border-b border-hair bg-surface-2/60 px-5 py-4 last:border-0"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-900 text-gold-400 dark:bg-surface-2">
                    <ClipboardCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
                      Checkpoint · after video {row.afterVideoOrder}
                    </p>
                    <p className="mt-0.5 font-medium text-heading">AI-graded assignment</p>
                  </div>
                  {res.passed ? (
                    <Badge variant="success">Passed {res.bestScore}%</Badge>
                  ) : unlocked ? (
                    <Link
                      href={`/learn/${course.id}/assignment/${row.id}`}
                      className={buttonClasses({ variant: "navy", size: "sm" })}
                    >
                      {res.attempts > 0 ? "Retry" : "Start"}
                    </Link>
                  ) : (
                    <Badge variant="neutral"><Lock className="h-3 w-3" /> Locked</Badge>
                  )}
                </div>
              );
            })}
          </div>

          {course.workbookUrl && (
            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-3xl border border-gold-300 bg-gold-50 p-5 dark:border-gold-500/25 dark:bg-gold-500/10">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-500 text-navy-900">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading font-bold text-heading">Final workbook</p>
                <p className="text-sm text-muted">
                  {access
                    ? "Download and complete your final workbook (PDF / DOCX)."
                    : "Enroll to unlock the final workbook."}
                </p>
              </div>
              {access ? (
                <a
                  href={course.workbookUrl}
                  download={course.workbookName ?? "workbook"}
                  className={buttonClasses({ variant: "primary", size: "sm" })}
                >
                  <Download className="h-4 w-4" /> Download
                </a>
              ) : (
                <Badge variant="neutral">
                  <Lock className="h-3 w-3" /> Locked
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* ── Instructor bio ── */}
        <div className="min-w-0">
          <h2 className="mb-5 font-heading text-xl font-bold text-heading sm:text-2xl">
            Your instructor
          </h2>
          <div className="rounded-3xl border border-hair bg-card p-6">
            <div className="flex items-center gap-3.5">
              <Avatar name={course.instructorName} size={52} />
              <div className="min-w-0">
                <p className="font-heading text-lg font-bold text-heading">{course.instructorName}</p>
                <p className="truncate text-sm text-muted">{course.instructorTitle}</p>
              </div>
            </div>
            <p className="mt-5 border-t border-hair pt-5 text-sm leading-[1.75] text-muted">
              {course.instructorBio}
            </p>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-surface-2 p-4 text-sm">
              <Award className="h-5 w-5 shrink-0 text-gold-600" />
              <span className="text-muted">
                Rated <span className="font-heading font-bold text-heading">{course.rating.toFixed(1)}</span> by{" "}
                {course.ratingCount} learners
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Recommended ── */}
      {recommended.length > 0 && (
        <section>
          <h2 className="mb-5 font-heading text-xl font-bold text-heading sm:text-2xl">
            You might also like
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((c) => (
              <CourseCard key={c.id} course={c} enrolled={isEnrolled(c.id)} />
            ))}
          </div>
        </section>
      )}

      <CheckoutModal
        course={course}
        open={checkout}
        onClose={() => setCheckout(false)}
        onComplete={() => router.push(`/learn/${course.id}/1`)}
      />
    </div>
  );
}
