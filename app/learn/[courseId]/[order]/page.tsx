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
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { MockVideoPlayer } from "@/components/learn/MockVideoPlayer";
import { MuxVideoPlayer } from "@/components/learn/MuxVideoPlayer";
import { LeapChat } from "@/components/learn/LeapChat";
import { useApp } from "@/lib/store/AppProvider";
import { useRequireLearner } from "@/components/app/guards";
import { cn, formatClock, timeAgo } from "@/lib/utils";
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
    markVideoComplete,
    isVideoCompleted,
    courseProgress,
    assignmentResult,
    notesFor,
    addNote,
    deleteNote,
  } = useApp();

  const [bottomTab, setBottomTab] = React.useState<"notes" | "transcript" | "resources">("transcript");
  const [rightTab, setRightTab] = React.useState<"chat" | "notes">("chat");
  const [noteText, setNoteText] = React.useState("");

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

  const bottomTabs = [
    { id: "notes" as const, label: "Class Notes", icon: FileText },
    { id: "transcript" as const, label: "Transcript", icon: ScrollText },
    { id: "resources" as const, label: "Resources", icon: Paperclip },
  ];

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-hair bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/courses/${course.slug}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2"
              aria-label="Back to topic"
            >
              <X className="h-5 w-5" />
            </Link>
            <div className="h-6 w-px bg-hair" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-heading">{course.title}</p>
              <p className="truncate text-xs text-faint">
                Video {video.order} · {video.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-heading sm:inline">
              {prog.completed}/{prog.total} videos
            </span>
            <Logo href="/dashboard" size="sm" className="hidden sm:inline-flex" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
          {/* Left: player + meta */}
          <div className="space-y-5">
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

            <Card padded>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-faint">
                    Video {video.order} · {formatClock(video.durationSeconds)}
                  </p>
                  <h1 className="mt-0.5 font-heading text-xl font-bold text-heading">{video.title}</h1>
                </div>
                {completed && (
                  <Badge variant="success">
                    <Check className="h-3 w-3" /> Completed
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{video.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!completed && (
                  <Button onClick={() => markVideoComplete(video.id)}>
                    <Check className="h-4 w-4" /> Mark complete
                  </Button>
                )}
                {completed && playerNextHref && (
                  <Link href={playerNextHref} className={buttonClasses({ variant: "primary" })}>
                    Next video <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                {completed && !playerNextHref && !gateAssignment && (
                  <Link href={`/courses/${course.slug}`} className={buttonClasses({ variant: "outline" })}>
                    Back to roadmap
                  </Link>
                )}
              </div>
            </Card>

            {/* Assignment unlock banner */}
            {gateAssignment && completed && (
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4",
                  gateRes?.passed
                    ? "border-green-200 bg-green-50 dark:bg-green-500/10"
                    : "border-gold-200 bg-gradient-to-r from-gold-50 to-cream-100 dark:from-gold-500/10 dark:to-transparent",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-xl",
                      gateRes?.passed ? "bg-green-100 text-green-600" : "bg-gold-100 text-gold-600",
                    )}
                  >
                    <ClipboardCheck className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-heading font-semibold text-heading">
                      {gateRes?.passed ? "Checkpoint passed 🎉" : "Assignment unlocked!"}
                    </p>
                    <p className="text-sm text-muted">
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

            {/* Bottom tabs */}
            <Card className="overflow-hidden">
              <div className="flex border-b border-hair">
                {bottomTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setBottomTab(t.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                      bottomTab === t.id
                        ? "border-b-2 border-gold-500 text-heading"
                        : "text-muted hover:text-heading",
                    )}
                  >
                    <t.icon className="h-4 w-4" /> {t.label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {bottomTab === "notes" && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-muted">{video.notesPdfName}</span>
                      <button
                        onClick={downloadNotes}
                        className={buttonClasses({ variant: "outline", size: "sm" })}
                      >
                        <Download className="h-4 w-4" /> Download
                      </button>
                    </div>
                    <div className="rounded-xl bg-surface-2 p-4 sm:p-6">
                      <div className="mx-auto max-w-2xl rounded-lg bg-card p-6 shadow-sm sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">
                          LEAP Coach · Class Notes
                        </p>
                        <h3 className="mt-1 font-heading text-xl font-bold text-heading">{video.title}</h3>
                        <p className="mt-4 leading-relaxed text-heading">{video.summary}</p>
                        <ul className="mt-4 space-y-2.5">
                          {video.transcript
                            .split(/(?<=[.!?])\s+/)
                            .filter(Boolean)
                            .slice(0, 4)
                            .map((s, i) => (
                              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted">
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
                    <p className="leading-relaxed text-muted">{video.transcript}</p>
                    <p className="mt-4 text-xs text-faint">
                      Transcript auto-syncs with the video when timestamps are available.
                    </p>
                  </div>
                )}

                {bottomTab === "resources" && (
                  <ul className="space-y-2.5">
                    {video.resources.length ? (
                      video.resources.map((r) => (
                        <li key={r.id}>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-xl border border-hair px-4 py-3 transition-colors hover:border-gold-300 hover:bg-gold-50"
                          >
                            <span className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-muted">
                                <Paperclip className="h-4 w-4" />
                              </span>
                              <span>
                                <span className="block text-sm font-medium text-heading">{r.title}</span>
                                <span className="block text-xs capitalize text-faint">
                                  {r.type}
                                  {r.author ? ` · ${r.author}` : ""}
                                </span>
                              </span>
                            </span>
                            <ExternalLink className="h-4 w-4 text-faint" />
                          </a>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-muted">No extra resources for this lesson.</li>
                    )}
                  </ul>
                )}
              </div>
            </Card>
          </div>

          {/* Right: chat / notes */}
          <aside className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-hair bg-card shadow-card lg:sticky lg:top-20 lg:h-[640px]">
            <div className="flex shrink-0 border-b border-hair p-1.5">
              <button
                onClick={() => setRightTab("chat")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
                  rightTab === "chat" ? "bg-navy-800 text-white" : "text-muted hover:bg-surface-2",
                )}
              >
                <Bot className="h-4 w-4" /> Ask LEAP AI
              </button>
              <button
                onClick={() => setRightTab("notes")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
                  rightTab === "notes" ? "bg-navy-800 text-white" : "text-muted hover:bg-surface-2",
                )}
              >
                <StickyNote className="h-4 w-4" /> My Notes
              </button>
            </div>

            <div className="min-h-0 flex-1">
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
                  <div className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto p-3">
                    {myNotes.length ? (
                      myNotes.map((n) => (
                        <div key={n.id} className="group rounded-xl border border-hair bg-surface p-3">
                          <p className="whitespace-pre-line text-sm text-heading">{n.text}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-faint">{timeAgo(n.createdAt)}</span>
                            <button
                              onClick={() => deleteNote(n.id)}
                              className="text-faint opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                              aria-label="Delete note"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="px-1 py-6 text-center text-sm text-faint">
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
    </div>
  );
}
