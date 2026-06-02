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
    enrollFree,
    isVideoCompleted,
    isVideoUnlocked,
    courseProgress,
    assignmentUnlocked,
    assignmentResult,
  } = useApp();

  const [checkout, setCheckout] = React.useState(false);
  const course = getCourseBySlug(params.slug);

  if (!course) {
    return (
      <div className="py-20 text-center">
        <p className="font-heading text-xl font-bold text-navy-800">Topic not found</p>
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
        (c.hashtags.some((h) => course.hashtags.includes(h)) || c.category === course.category),
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
    <div className="space-y-8">
      <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-navy-800">
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </Link>

      {/* Hero */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="navy" className="capitalize">{course.category}</Badge>
            <Badge variant="neutral">{course.level}</Badge>
            {course.trending && <Badge variant="trending">🔥 Trending</Badge>}
            {enrolled && <Badge variant="success"><Check className="h-3 w-3" /> Enrolled</Badge>}
          </div>
          <h1 className="mt-3 font-heading text-3xl font-bold leading-tight text-navy-800 sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{course.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
              <span className="font-semibold text-navy-700">{course.rating.toFixed(1)}</span>
              ({course.ratingCount})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {course.enrolledCount.toLocaleString("en-IN")} enrolled
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {formatDuration(duration)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" /> {course.videos.length} videos
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {course.hashtags.map((h) => (
              <span key={h} className="rounded-full bg-cream-100 px-2.5 py-1 text-xs font-medium text-navy-600">
                {h}
              </span>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Avatar name={course.instructorName} size={44} />
            <div>
              <p className="font-heading font-semibold text-navy-800">{course.instructorName}</p>
              <p className="text-sm text-ink-soft">{course.instructorTitle}</p>
            </div>
          </div>
        </div>

        {/* Access / enroll card */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-card">
            <CourseThumb accent={course.accent} category={course.category} className="aspect-[16/9]" />
            <div className="p-5">
              {enrolled ? (
                <>
                  <div className="flex items-center gap-4">
                    <ProgressRing value={prog.pct} size={72} stroke={7} />
                    <div>
                      <p className="font-heading font-semibold text-navy-800">Your progress</p>
                      <p className="text-sm text-ink-soft">
                        {prog.completed} of {prog.total} videos complete
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/learn/${course.id}/${resumeOrder}`}
                    className={buttonClasses({ variant: "primary", size: "lg", className: "mt-5 w-full" })}
                  >
                    {prog.completed > 0 ? "Continue learning" : "Start course"}{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="font-heading text-3xl font-bold text-navy-800">
                      {course.price === 0 ? "Free" : formatINR(course.price)}
                    </span>
                    {course.price > 0 && <span className="text-sm text-ink-faint">lifetime access</span>}
                  </div>
                  {access && course.price > 0 && (
                    <p className="mt-1 text-sm font-medium text-green-600">Included in your All-Access Pass</p>
                  )}
                  <Button onClick={handleEnroll} size="lg" className="mt-4 w-full">
                    {course.price === 0 || access ? "Enroll now" : `Enroll · ${formatINR(course.price)}`}
                  </Button>
                  <ul className="mt-5 space-y-2.5 text-sm text-ink-soft">
                    {[
                      `${course.videos.length} avatar-led videos`,
                      `${course.assignments.length} AI-graded checkpoints`,
                      "LEAP AI tutor on every video",
                      "Class notes, transcripts & resources",
                      "Lifetime access",
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 shrink-0 text-green-600" /> {f}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus / Roadmap */}
      <section className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold text-navy-800">
              {enrolled ? "Your roadmap" : "Topic syllabus"}
            </h2>
            <span className="text-sm text-ink-soft">{course.videos.length} videos</span>
          </div>

          {enrolled && (
            <div className="mb-4 rounded-2xl border border-cream-200 bg-white p-4 shadow-card">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-navy-700">Overall progress</span>
                <span className="font-semibold text-navy-800">{prog.pct}%</span>
              </div>
              <ProgressBar value={prog.pct} size="lg" />
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-card">
            {rows.map((row, i) => {
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
                      "flex items-center gap-4 border-b border-cream-200 px-5 py-4 last:border-0",
                      clickable ? "cursor-pointer hover:bg-cream-50" : "opacity-80",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                        done
                          ? "bg-green-100 text-green-600"
                          : open
                            ? "bg-gold-100 text-gold-600"
                            : "bg-cream-100 text-ink-faint",
                      )}
                    >
                      {done ? <CheckCircle2 className="h-5 w-5" /> : open ? <PlayCircle className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-ink-faint">Video {video.order}</p>
                      <p className="font-medium text-navy-800">{video.title}</p>
                    </div>
                    <span className="text-sm text-ink-faint">{formatClock(video.durationSeconds)}</span>
                  </Tag>
                );
              }

              // assignment checkpoint
              const unlocked = enrolled && assignmentUnlocked(row.id);
              const res = assignmentResult(row.id);
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-4 border-b border-cream-200 bg-cream-50/60 px-5 py-4 last:border-0"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-100 text-navy-700">
                    <ClipboardCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ink-faint">
                      Checkpoint · after video {row.afterVideoOrder}
                    </p>
                    <p className="font-medium text-navy-800">AI-graded assignment</p>
                  </div>
                  {res.passed ? (
                    <Badge variant="success">Passed {res.bestScore}%</Badge>
                  ) : unlocked ? (
                    <Link href={`/learn/${course.id}/assignment/${row.id}`} className={buttonClasses({ variant: "navy", size: "sm" })}>
                      {res.attempts > 0 ? "Retry" : "Start"}
                    </Link>
                  ) : (
                    <Badge variant="neutral"><Lock className="h-3 w-3" /> Locked</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Instructor bio */}
        <div>
          <h2 className="mb-4 font-heading text-2xl font-bold text-navy-800">Your instructor</h2>
          <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-card">
            <div className="flex items-center gap-3">
              <Avatar name={course.instructorName} size={52} />
              <div>
                <p className="font-heading text-lg font-semibold text-navy-800">{course.instructorName}</p>
                <p className="text-sm text-ink-soft">{course.instructorTitle}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">{course.instructorBio}</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-cream-50 p-3 text-sm">
              <Award className="h-5 w-5 text-gold-600" />
              <span className="text-ink-soft">Rated <span className="font-semibold text-navy-700">{course.rating.toFixed(1)}</span> by {course.ratingCount} learners</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended */}
      {recommended.length > 0 && (
        <section>
          <h2 className="mb-4 font-heading text-2xl font-bold text-navy-800">You might also like</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
