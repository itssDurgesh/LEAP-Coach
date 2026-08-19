"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  X,
  Loader2,
  Check,
  ArrowRight,
  FileText,
  ScrollText,
  Paperclip,
  Download,
  Bot,
  StickyNote,
  Trash2,
  ClipboardCheck,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { MockVideoPlayer } from "@/components/learn/MockVideoPlayer";
import { MuxVideoPlayer } from "@/components/learn/MuxVideoPlayer";
import { LeapChat } from "@/components/learn/LeapChat";
import { RatingModal } from "@/components/learn/RatingModal";
import { VideoComments } from "@/components/discussion/VideoComments";
import { useApp } from "@/lib/store/AppProvider";
import { useRequireLearner } from "@/components/app/guards";
import { cn, formatClock, timeAgo } from "@/lib/utils";
import { downloadNotesPdf } from "@/lib/pdf";
import { Course, Video } from "@/lib/types";

export default function PlayerPage() {
  const { ready } = useRequireLearner();
  const params = useParams<{ courseId: string; order: string }>();
  const router = useRouter();
  const {
    getCourse,
    isEnrolled,
    hasAccess,
    isVideoUnlocked,
    isVideoCompleted,
  } = useApp();

  const ord = Number(params.order);
  const course = getCourse(params.courseId);
  const video = course?.videos.find((v) => v.order === ord);

  React.useEffect(() => {
    if (!ready || !course) return;
    if (!video) {
      router.replace(`/courses/${course.slug}`);
      return;
    }
    if (!isEnrolled(course.id) || !hasAccess(course.id) || !isVideoUnlocked(course.id, ord)) {
      router.replace(`/courses/${course.slug}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, course?.id, video?.id, ord]);

  if (!ready || !course || !video || !isEnrolled(course.id) || !isVideoUnlocked(course.id, ord)) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
      </div>
    );
  }

  return <Player course={course} video={video} />;
}

function Player({ course, video }: { course: Course; video: Video }) {
  const {
    currentUser,
    markVideoComplete,
    isVideoCompleted,
    courseProgress,
    assignmentResult,
    notesFor,
    notesForCourse,
    addNote,
    deleteNote,
    videoCommentsFor,
    isCourseComplete,
    myRatingFor,
  } = useApp();

  const [bottomTab, setBottomTab] = React.useState<"notes" | "transcript" | "resources" | "discussion">("transcript");
  const [rightTab, setRightTab] = React.useState<"chat" | "notes">("chat");
  const [noteText, setNoteText] = React.useState("");
  const [rateOpen, setRateOpen] = React.useState(false);
  const promptedRef = React.useRef(false);

  // Prompt for a rating once the last video/checkpoint lands — once per learner per
  // topic, remembered so finishing another lesson later doesn't re-open it.
  // Re-rating stays available from the topic page.
  //
  // Deliberately synchronous with no setTimeout. Two earlier versions lost the
  // prompt to effect churn: deps included the currentUser object (new identity each
  // render), and the cleanup cancelled the pending timeout while the ref guard
  // stopped it ever being rescheduled. Primitive deps + no timer = nothing to cancel.
  const complete = isCourseComplete(course.id);
  const alreadyRated = !!myRatingFor(course.id);
  const learnerId = currentUser?.id;
  React.useEffect(() => {
    if (!complete || alreadyRated || !learnerId || promptedRef.current) return;
    const key = `leap-rated-prompt:${learnerId}:${course.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* private mode — fall through and show it */
    }
    promptedRef.current = true;
    setRateOpen(true);
  }, [complete, alreadyRated, learnerId, course.id]);

  const courseNotes = notesForCourse(course.id);

  const completed = isVideoCompleted(video.id);
  const prog = courseProgress(course.id);
  const isVishal = course.instructorName.includes("Vishal");
  const next = course.videos.find((v) => v.order === video.order + 1);

  const gateAssignment = course.assignments.find((a) => a.afterVideoOrder === video.order);
  const gateRes = gateAssignment ? assignmentResult(gateAssignment.id) : null;
  const playerNextHref =
    (!gateAssignment || gateRes?.passed) && next ? `/learn/${course.id}/${next.order}` : null;

  const myNotes = notesFor(video.id);

  function downloadNotes() {
    const body =
      `LEAP Coach — Class Notes\n${course.title}\nVideo ${video.order}: ${video.title}\n\n` +
      `${video.summary}\n\n${video.transcript}\n`;
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (video.notesPdfName ?? `${course.slug}-session-${video.order}-notes.pdf`).replace(/\.pdf$/, ".txt");
    a.click();
    URL.revokeObjectURL(url);
  }

  const discussionCount = videoCommentsFor(video.id).length;
  const bottomTabs = [
    { id: "notes" as const, label: "Class Notes", icon: FileText },
    { id: "transcript" as const, label: "Transcript", icon: ScrollText },
    { id: "resources" as const, label: "Resources", icon: Paperclip },
    {
      id: "discussion" as const,
      label: discussionCount > 0 ? `Discussion · ${discussionCount}` : "Discussion",
      icon: MessageCircle,
    },
  ];

  const progressPct = prog.total ? Math.round((prog.completed / prog.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 border-b border-hair bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[88rem] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/courses/${course.slug}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hair text-muted transition-all duration-200 hover:border-gold-500 hover:bg-gold-500 hover:text-navy-900"
              aria-label="Back to topic"
            >
              <X className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-bold text-heading">{course.title}</p>
              <p className="truncate text-xs text-faint">
                Video {video.order} · {video.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Course progress, as a real bar rather than a text pill */}
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-gold-500 transition-[width] duration-500 ease-out-expo"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="font-heading text-xs font-semibold tabular-nums text-muted">
                {prog.completed}/{prog.total}
              </span>
            </div>
            <Logo href="/dashboard" size="sm" className="hidden lg:inline-flex" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.75fr_1fr]">
          {/* ── Left: player + meta ──
              min-w-0: grid items default to min-width:auto, so without it the column
              refuses to shrink below its content and the page scrolls sideways on
              narrow screens. */}
          <div className="min-w-0 space-y-6">
            {/* Real Mux playback when the video has a genuine playback id; the seed
                uses "mux_…" placeholders, which fall back to the mock player. */}
            {video.muxPlaybackId && !video.muxPlaybackId.startsWith("mux_") ? (
              <MuxVideoPlayer
                course={course}
                video={video}
                onEnded={() => markVideoComplete(video.id)}
              />
            ) : (
              <MockVideoPlayer
                course={course}
                video={video}
                isVishal={isVishal}
                alreadyCompleted={completed}
                onEnded={() => markVideoComplete(video.id)}
                nextHref={playerNextHref}
              />
            )}

            {/* Lesson header — set flush, not boxed in a card */}
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-600">
                    Video {video.order} · {formatClock(video.durationSeconds)}
                  </p>
                  <h1 className="mt-2 font-heading text-display-sm font-bold leading-tight text-heading">
                    {video.title}
                  </h1>
                </div>
                {completed && (
                  <Badge variant="success">
                    <Check className="h-3 w-3" strokeWidth={3} /> Completed
                  </Badge>
                )}
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-[1.75] text-muted">{video.summary}</p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {!completed && (
                  <Button onClick={() => markVideoComplete(video.id)}>
                    <Check className="h-4 w-4" /> Mark complete
                  </Button>
                )}
                {completed && playerNextHref && (
                  <Link
                    href={playerNextHref}
                    className={buttonClasses({ variant: "primary", className: "group" })}
                  >
                    Next video
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
                  </Link>
                )}
                {completed && !playerNextHref && !gateAssignment && (
                  <Link href={`/courses/${course.slug}`} className={buttonClasses({ variant: "outline" })}>
                    Back to roadmap
                  </Link>
                )}
              </div>
            </div>

            {/* ── Assignment unlock banner ── */}
            {gateAssignment && completed && (
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-5",
                  gateRes?.passed
                    ? "border-green-200 bg-green-50 dark:border-green-500/25 dark:bg-green-500/10"
                    : "border-gold-300 bg-gold-50 dark:border-gold-500/25 dark:bg-gold-500/10",
                )}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                      gateRes?.passed ? "bg-green-500 text-white" : "bg-gold-500 text-navy-900",
                    )}
                  >
                    <ClipboardCheck className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-heading font-bold text-heading">
                      {gateRes?.passed ? "Checkpoint passed" : "Assignment unlocked"}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">
                      {gateRes?.passed
                        ? `You scored ${gateRes.bestScore}%. The next videos are open.`
                        : "Complete the AI-graded checkpoint to unlock the next videos."}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/learn/${course.id}/assignment/${gateAssignment.id}`}
                  className={buttonClasses({ variant: gateRes?.passed ? "outline" : "primary" })}
                >
                  {gateRes?.passed ? "Review" : gateRes && gateRes.attempts > 0 ? "Retry assignment" : "Start assignment"}
                </Link>
              </div>
            )}

            {/* ── Bottom tabs ── */}
            <div className="overflow-hidden rounded-3xl border border-hair bg-card">
              <div className="scrollbar-thin flex overflow-x-auto border-b border-hair">
                {bottomTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setBottomTab(t.id)}
                    className={cn(
                      "relative flex shrink-0 items-center gap-2 px-5 py-4 font-heading text-sm font-semibold transition-colors duration-200",
                      bottomTab === t.id ? "text-heading" : "text-muted hover:text-heading",
                    )}
                  >
                    <t.icon className="h-4 w-4" /> {t.label}
                    {bottomTab === t.id && (
                      <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold-500" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-5 sm:p-6">
                {bottomTab === "notes" && (
                  <div>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-medium text-muted">{video.notesPdfName}</span>
                      <button
                        onClick={downloadNotes}
                        className={buttonClasses({ variant: "outline", size: "sm" })}
                      >
                        <Download className="h-4 w-4" /> Download
                      </button>
                    </div>
                    <div className="rounded-2xl bg-surface-2 p-4 sm:p-7">
                      <div className="mx-auto max-w-2xl rounded-xl bg-card p-6 shadow-card sm:p-9">
                        <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-600">
                          LEAP Coach · Class Notes
                        </p>
                        <h3 className="mt-2 font-heading text-xl font-bold text-heading">{video.title}</h3>
                        <p className="mt-5 leading-[1.75] text-heading">{video.summary}</p>
                        <ul className="mt-5 space-y-3 border-t border-hair pt-5">
                          {video.transcript
                            .split(/(?<=[.!?])\s+/)
                            .filter(Boolean)
                            .slice(0, 4)
                            .map((s, i) => (
                              <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                                {s.trim()}
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {bottomTab === "transcript" && (
                  <div className="scrollbar-thin max-h-80 overflow-y-auto pr-2">
                    <p className="max-w-2xl leading-[1.8] text-muted">{video.transcript}</p>
                    <p className="mt-5 border-t border-hair pt-4 text-xs text-faint">
                      Transcript auto-syncs with the video when timestamps are available.
                    </p>
                  </div>
                )}

                {bottomTab === "discussion" && <VideoComments course={course} video={video} hideHeader />}

                {bottomTab === "resources" && (
                  <ul className="space-y-2.5">
                    {video.resources.length ? (
                      video.resources.map((r) => (
                        <li key={r.id}>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center justify-between rounded-2xl border border-hair px-4 py-3.5 transition-all duration-200 hover:border-gold-300 hover:bg-surface-2"
                          >
                            <span className="flex items-center gap-3.5">
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted transition-colors duration-200 group-hover:bg-gold-500 group-hover:text-navy-900">
                                <Paperclip className="h-4 w-4" />
                              </span>
                              <span>
                                <span className="block text-sm font-semibold text-heading">{r.title}</span>
                                <span className="block text-xs capitalize text-faint">
                                  {r.type}
                                  {r.author ? ` · ${r.author}` : ""}
                                </span>
                              </span>
                            </span>
                            <ExternalLink className="h-4 w-4 shrink-0 text-faint transition-colors duration-200 group-hover:text-gold-600" />
                          </a>
                        </li>
                      ))
                    ) : (
                      <li className="py-6 text-center text-sm text-faint">
                        No extra resources for this lesson.
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: chat / notes ── */}
          <aside className="flex h-[600px] min-w-0 flex-col overflow-hidden rounded-3xl border border-hair bg-card shadow-card lg:sticky lg:top-[5.5rem] lg:h-[calc(100vh-7rem)]">
            {/* Segmented control */}
            <div className="shrink-0 p-2">
              <div className="flex rounded-full bg-surface-2 p-1">
                <button
                  onClick={() => setRightTab("chat")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 font-heading text-sm font-semibold transition-all duration-200",
                    rightTab === "chat"
                      ? "bg-card text-heading shadow-sm"
                      : "text-muted hover:text-heading",
                  )}
                >
                  <Bot className="h-4 w-4" /> Ask LEAP AI
                </button>
                <button
                  onClick={() => setRightTab("notes")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 font-heading text-sm font-semibold transition-all duration-200",
                    rightTab === "notes"
                      ? "bg-card text-heading shadow-sm"
                      : "text-muted hover:text-heading",
                  )}
                >
                  <StickyNote className="h-4 w-4" /> My Notes
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 border-t border-hair">
              {rightTab === "chat" ? (
                <LeapChat course={course} video={video} showHeader={false} />
              ) : (
                <div className="flex h-full flex-col">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addNote(video.id, noteText);
                      setNoteText("");
                    }}
                    className="border-b border-hair p-3"
                  >
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Jot a private note for this lesson…"
                      className="min-h-[72px] text-sm"
                    />
                    <Button type="submit" size="sm" className="mt-2 w-full" disabled={!noteText.trim()}>
                      Save note
                    </Button>
                  </form>
                  {courseNotes.length > 0 && (
                    <button
                      onClick={() => downloadNotesPdf(course, courseNotes, currentUser?.name)}
                      className="flex items-center justify-center gap-2 border-b border-hair px-3 py-3 font-heading text-sm font-semibold text-gold-700 transition-colors duration-200 hover:bg-surface-2"
                      title="Combine every note you've saved across this topic into one PDF"
                    >
                      <Download className="h-4 w-4" /> Download all my notes ({courseNotes.length}) · PDF
                    </button>
                  )}
                  <div className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto p-3">
                    {myNotes.length ? (
                      myNotes.map((n) => (
                        <div
                          key={n.id}
                          className="group rounded-2xl border border-hair bg-surface p-3.5 transition-colors duration-200 hover:border-gold-300"
                        >
                          <p className="whitespace-pre-line text-sm leading-relaxed text-heading">{n.text}</p>
                          <div className="mt-2.5 flex items-center justify-between border-t border-hair pt-2.5">
                            <span className="text-xs text-faint">{timeAgo(n.createdAt)}</span>
                            <button
                              onClick={() => deleteNote(n.id)}
                              className="text-faint opacity-0 transition-all duration-200 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                              aria-label="Delete note"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="px-1 py-8 text-center text-sm text-faint">
                        Your private notes for this lesson will appear here.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      <RatingModal course={course} open={rateOpen} onClose={() => setRateOpen(false)} />
    </div>
  );
}
