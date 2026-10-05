"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, Check, CheckCircle2, ClipboardCheck, Clock, Download, FileText, Lock, Play, Star } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CourseThumb } from "@/components/CourseThumb";
import { CheckoutModal } from "@/components/CheckoutModal";
import { RatingModal } from "@/components/learn/RatingModal";
import { TopicCard } from "@/components/v2/TopicCard";
import { Bar, LevelChip, V2Card, v2Button } from "@/components/v2/ui";
import { levelStyle } from "@/lib/levels";
import { resumeTarget } from "@/lib/resume";
import { useApp } from "@/lib/store/AppProvider";
import { courseCategories, ownsTopic } from "@/lib/types";
import { buildTopicReport } from "@/lib/report";
import { topicCredit, TOPIC_CREDIT_MAX } from "@/lib/credits";
import { downloadNotesPdf } from "@/lib/pdf";
import { cn, formatINR, formatDuration, formatClock } from "@/lib/utils";

const ROW = "flex items-center gap-3.5 rounded-[14px] px-3 py-2.5";
const DOT = "grid h-8 w-8 shrink-0 place-items-center rounded-full";
const CHIP = "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold leading-[18px]";
const pad = (n: number) => String(n).padStart(2, "0");
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

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
  const app = useApp();
  const {
    currentUser,
    courses,
    tracks,
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
    isCourseComplete,
    myRatingFor,
  } = app;

  const [checkout, setCheckout] = React.useState(false);
  const [rateOpen, setRateOpen] = React.useState(false);
  const course = getCourseBySlug(params.slug);

  if (!course) {
    return (
      <div className="py-20 text-center">
        <p className="font-heading text-xl font-semibold text-heading">Topic not found</p>
        <Link href="/courses" className={v2Button("primary", "md", "mt-5")}>
          Back to catalog
        </Link>
      </div>
    );
  }

  const enrolled = isEnrolled(course.id);
  const access = hasAccess(course.id);
  const prog = courseProgress(course.id);
  const duration = course.videos.reduce((s, v) => s + v.durationSeconds, 0);
  const resume = resumeTarget(course, app);

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
  const myRating = myRatingFor(course.id);
  const topicComplete = isCourseComplete(course.id);

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
    .slice(0, 4);

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


  const s = levelStyle(course.tracks[0]);
  // The first video the learner can open but has not finished.
  const upNextOrder = enrolled
    ? course.videos
        .slice()
        .sort((a, b) => a.order - b.order)
        .find((v) => !isVideoCompleted(v.id) && isVideoUnlocked(course.id, v.order))?.order
    : undefined;
  // "8 videos" plus "2 checkpoints" when the topic has any.
  const lessons = [count(course.videos.length, "video")];
  if (course.assignments.length) lessons.push(count(course.assignments.length, "checkpoint"));
  const sep = (
    <span aria-hidden className="text-v2-on-navy-muted">
      ·
    </span>
  );

  return (
    <div className="space-y-7">
      <Link
        href="/courses"
        className="group inline-flex items-center gap-2 text-sm font-semibold text-v2-body transition-colors duration-200 hover:text-heading"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:-translate-x-1" />
        Back to catalog
      </Link>

      {/* ── Hero ── */}
      <div className="relative flex flex-col gap-8 overflow-hidden rounded-[24px] bg-v2-navy p-7 shadow-v2-card lg:flex-row lg:items-center">
        {/* Decorative circles, clipped by the card. */}
        <span aria-hidden className="pointer-events-none absolute -right-[150px] -top-[200px] h-[280px] w-[280px] rounded-full bg-gold-400/20" />
        <span aria-hidden className="pointer-events-none absolute -bottom-[110px] -right-[60px] h-[180px] w-[180px] rounded-full bg-lv-self/30" />

        <CourseThumb
          accent={course.accent}
          category={course.category}
          title={course.title}
          src={course.thumbnailUrl}
          rounded="rounded-2xl"
          className="relative aspect-[16/10] w-full shrink-0 lg:w-[360px]"
        />

        <div className="relative min-w-0 flex-1 space-y-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <LevelChip trackId={course.tracks[0]} tracks={tracks} />
            {enrolled && (
              <span className={cn(CHIP, "bg-v2-navy-raised text-white")}>
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> Enrolled
              </span>
            )}
            {course.trending && <span className={cn(CHIP, "bg-[#E9B93E] text-navy-800")}>Trending</span>}
            <span className="text-[13px] font-medium text-v2-on-navy-muted">{course.level}</span>
          </div>

          <h1 className="text-balance font-heading text-[32px] font-bold leading-[38px] tracking-[-0.015em] text-white">{course.title}</h1>
          <p className="text-[15px] leading-6 text-v2-on-navy-muted">{course.description}</p>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium leading-5 text-white">
            <Star className="h-3.5 w-3.5 fill-gold-400 text-gold-400" />
            {course.ratingCount > 0 ? `${course.rating.toFixed(1)} (${course.ratingCount})` : "New"}
            {sep} {course.enrolledCount.toLocaleString("en-IN")} learners
            {sep} {formatDuration(duration)}
            {sep} {lessons.join(", ")}
          </p>

          {expired ? (
            <div className="pt-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <Clock className="h-4 w-4 text-gold-400" /> Access expired
              </p>
              <p className="mt-1 text-[13px] font-medium text-v2-on-navy-muted">
                Your 1-year access ended on {fmtDate(expiresAt!)}. Re-purchase to unlock this topic for another year.
              </p>
              <button type="button" onClick={() => setCheckout(true)} className={v2Button("primary", "md", "mt-4")}>
                Renew · {formatINR(course.price)}
              </button>
            </div>
          ) : enrolled ? (
            <>
              <div className="flex items-center gap-3">
                <Bar pct={prog.pct} className="flex-1" trackClass="bg-v2-navy-raised" />
                <span className="shrink-0 text-[13px] font-semibold text-white">
                  {prog.completed} of {prog.total} videos
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
                {resume.kind === "checkpoint" ? (
                  <Link href={resume.href} className={v2Button("primary")}>
                    <ClipboardCheck className="h-4 w-4" /> Take the checkpoint
                  </Link>
                ) : (
                  // With every video watched, the button replays the topic from the start.
                  <Link href={resume.kind === "video" ? resume.href : `/learn/${course.id}/1`} className={v2Button("primary")}>
                    <Play className="h-4 w-4 fill-current" />
                    {resume.kind !== "video" ? "Watch again" : prog.completed > 0 ? "Continue learning" : "Start topic"}
                  </Link>
                )}
                {topicComplete && (
                  <button type="button" onClick={() => setRateOpen(true)} className={v2Button("ghostOnNavy", "md", "px-3")}>
                    <Star className={cn("h-4 w-4", myRating && "fill-gold-400 text-gold-400")} />
                    {myRating ? `Your rating · ${myRating.stars}/5` : "Rate this topic"}
                  </button>
                )}
                {expiresAt && <span className="text-[13px] font-medium text-v2-on-navy-muted">Access until {fmtDate(expiresAt)}</span>}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
              <span className="font-heading text-[32px] font-bold leading-[38px] tracking-[-0.015em] text-white">
                {course.price === 0 ? "Free" : formatINR(course.price)}
              </span>
              <button type="button" onClick={handleEnroll} className={v2Button("primary")}>
                {course.price === 0 || access ? "Enroll now" : `Enroll · ${formatINR(course.price)}`}
              </button>
              {access && course.price > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white">
                  <Check className="h-4 w-4 text-gold-400" strokeWidth={3} /> Included in your All-Access Pass
                </span>
              ) : (
                course.price > 0 && <span className="text-[13px] font-medium text-v2-on-navy-muted">1 year of access</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Performance report — shown once the learner completes the whole topic ── */}
      {enrolled && report?.completed && (
        <section className="rounded-[24px] bg-v2-gold-soft p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn(CHIP, "bg-lv-orgs-tint text-lv-orgs-dark")}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Topic completed
              </span>
              <h2 className="font-heading text-xl font-semibold leading-[25px] tracking-[-0.015em] text-heading">Your performance report</h2>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={cn("h-4 w-4", n <= report.stars ? "fill-gold-400 text-gold-400" : "text-v2-line-strong")} />
                ))}
                <span className="ml-1.5 text-xs font-bold tabular-nums text-heading">{report.stars}.0 / 5</span>
              </div>
              <span className={cn(CHIP, "bg-[#E9B93E] tabular-nums text-navy-800")}>
                <Award className="h-3.5 w-3.5" /> {earnedCredit} / {TOPIC_CREDIT_MAX} credits
              </span>
            </div>
            <button
              type="button"
              onClick={() => downloadNotesPdf(course, myNotes, currentUser?.name)}
              disabled={!myNotes.length}
              className={v2Button("outline", "sm")}
            >
              <Download className="h-3.5 w-3.5" /> Download notes (PDF)
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-card p-4">
                <stat.icon className="h-4 w-4 text-v2-gold-text" />
                <p className="mt-2.5 font-heading text-lg font-bold leading-6 tracking-[-0.015em] tabular-nums text-heading">{stat.value}</p>
                <p className="mt-0.5 text-xs font-medium text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
          {!myNotes.length && (
            <p className="mt-4 text-xs font-medium text-v2-body">Save notes while watching to export them all as a PDF here.</p>
          )}
        </section>
      )}

      {/* ── Roadmap + side column ── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_416px] lg:items-start">
        <V2Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-xl font-semibold leading-[25px] tracking-[-0.015em] text-heading">
              {enrolled ? "Your roadmap" : "Topic syllabus"}
            </h2>
            <span className="shrink-0 text-[13px] font-medium text-muted">
              {lessons.join(" · ")}
            </span>
          </div>

          <div className="mt-3.5 space-y-1">
            {rows.map((row) => {
              if (row.kind === "video") {
                const video = course.videos.find((v) => v.order === row.order)!;
                const done = enrolled && isVideoCompleted(video.id);
                const open = enrolled && isVideoUnlocked(course.id, video.order);
                const next = video.order === upNextOrder;
                const body = (
                  <>
                    <span
                      className={cn(
                        DOT,
                        done ? cn(s.base, s.on) : open ? "bg-[#E9B93E] text-navy-800" : "bg-surface-2 text-xs font-semibold text-muted",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : open ? <Play className="h-3 w-3 fill-current" /> : pad(video.order)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-5 text-heading">{video.title}</p>
                      <p className="text-xs font-medium text-muted">
                        Video {pad(video.order)} &nbsp;·&nbsp; {formatClock(video.durationSeconds)}
                      </p>
                    </div>
                    {done ? (
                      <span className="shrink-0 text-xs font-medium text-muted">Watched</span>
                    ) : (
                      next && <span className={cn(CHIP, "bg-[#E9B93E] text-navy-800")}>Up next</span>
                    )}
                  </>
                );
                return done || open ? (
                  <Link
                    key={video.id}
                    href={`/learn/${course.id}/${video.order}`}
                    className={cn(ROW, "transition-colors duration-200", next ? "bg-v2-gold-soft" : "hover:bg-surface")}
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={video.id} className={ROW}>
                    {body}
                  </div>
                );
              }

              // assignment checkpoint
              const unlocked = enrolled && assignmentUnlocked(row.id);
              const res = assignmentResult(row.id);
              return (
                <div key={row.id} className={cn(ROW, "bg-surface")}>
                  <span className={cn(DOT, "bg-v2-gold-soft text-v2-gold-text")}>
                    <ClipboardCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-5 text-heading">Checkpoint: AI-graded assignment</p>
                    <p className="text-xs font-medium text-muted">After video {pad(row.afterVideoOrder)}</p>
                  </div>
                  {res.passed ? (
                    <span className={cn(CHIP, "bg-lv-orgs-tint text-lv-orgs-dark")}>
                      <Check className="h-3.5 w-3.5" strokeWidth={3} /> Passed {res.bestScore}%
                    </span>
                  ) : unlocked ? (
                    <Link href={`/learn/${course.id}/assignment/${row.id}`} className={v2Button("strong", "sm")}>
                      {res.attempts > 0 ? "Retry" : "Start"}
                    </Link>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </V2Card>

        <div className="min-w-0 space-y-6">
          {/* What enrolling includes, for learners who have not joined yet. */}
          {!enrolled && !expired && (
            <V2Card className="p-6">
              <h2 className="font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">What you get</h2>
              <ul className="mt-3.5 space-y-2.5 text-sm leading-5 text-v2-body">
                {[
                  `${course.videos.length} video lessons`,
                  `${course.assignments.length} AI-graded checkpoints`,
                  "LEAP AI tutor on every video",
                  "Class notes, transcripts & resources",
                  course.price > 0 ? "1 year of access" : "Free — no expiry",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-lv-orgs-dark" strokeWidth={2.5} /> {f}
                  </li>
                ))}
              </ul>
            </V2Card>
          )}

          <V2Card className="space-y-3.5 p-6">
            <div className="flex items-center gap-3.5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-v2-strong font-heading text-lg font-bold tracking-[-0.015em] text-v2-on-strong">
                {course.instructorInitials}
              </span>
              <div className="min-w-0">
                <p className="font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">{course.instructorName}</p>
                <p className="mt-0.5 text-xs font-medium text-muted">{course.instructorTitle}</p>
              </div>
            </div>
            {course.instructorBio && <p className="text-sm leading-5 text-v2-body">{course.instructorBio}</p>}
            <p className="flex items-center gap-1.5 text-[13px] font-semibold leading-5 text-heading">
              <Star className="h-3.5 w-3.5 shrink-0 fill-gold-400 text-gold-600" />
              {course.ratingCount > 0
                ? `Rated ${course.rating.toFixed(1)} by ${count(course.ratingCount, "learner")}`
                : "Not rated yet — be the first to review this topic"}
            </p>
          </V2Card>

          {course.workbookUrl && (
            <V2Card className="flex items-center gap-4 p-5">
              <span className="flex h-[72px] w-[60px] shrink-0 flex-col items-center justify-center gap-1 rounded-[14px] bg-lv-people-tint text-lv-people-dark">
                <FileText className="h-[22px] w-[22px]" />
                <span className="text-[10.5px] font-bold uppercase tracking-[0.06em]">
                  {course.workbookName?.includes(".") ? course.workbookName.split(".").pop() : "File"}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">Final workbook</p>
                <p className="mt-1 text-xs font-medium text-muted">
                  {access ? "Complete it once you finish the videos." : "Enroll to unlock the final workbook."}
                </p>
              </div>
              {access ? (
                <a href={course.workbookUrl} download={course.workbookName ?? "workbook"} className={v2Button("outline", "sm")}>
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </V2Card>
          )}

          {course.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {course.hashtags.map((h) => (
                <span key={h} className="rounded-full border border-hair bg-card px-3 py-1.5 text-xs font-semibold leading-[18px] text-v2-body">
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recommended ── */}
      {recommended.length > 0 && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-heading text-2xl font-bold leading-[30px] tracking-[-0.015em] text-heading">You might also like</h2>
            <Link href="/courses" className={v2Button("outline", "sm")}>
              Browse catalog <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {recommended.map((c) => (
              <TopicCard key={c.id} course={c} tracks={tracks} owned={!!currentUser && ownsTopic(currentUser, c, isEnrolled(c.id))} />
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

      <RatingModal course={course} open={rateOpen} onClose={() => setRateOpen(false)} />
    </div>
  );
}
