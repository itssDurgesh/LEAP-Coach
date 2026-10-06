"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Download, ExternalLink, Loader2, Paperclip, Play, Trash2 } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { AppShell } from "@/components/app/AppShell";
import { MockVideoPlayer } from "@/components/learn/MockVideoPlayer";
import { MuxVideoPlayer } from "@/components/learn/MuxVideoPlayer";
import { LeapChat } from "@/components/learn/LeapChat";
import { RatingModal } from "@/components/learn/RatingModal";
import { VideoComments } from "@/components/discussion/VideoComments";
import { SegTabs, V2Card, v2Button } from "@/components/v2/ui";
import { useApp } from "@/lib/store/AppProvider";
import { cn, formatClock, timeAgo } from "@/lib/utils";
import { downloadNotesPdf, downloadLessonNotesPdf } from "@/lib/pdf";
import { Course, Video } from "@/lib/types";

type BottomTab = "notes" | "transcript" | "resources" | "discussion";

const ROW = "flex items-center gap-3.5 rounded-[14px] px-3 py-2.5";
const DOT = "grid h-8 w-8 shrink-0 place-items-center rounded-full";
const CHIP = "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold leading-[18px]";
const pad = (n: number) => String(n).padStart(2, "0");

export default function PlayerPage() {
  return (
    <AppShell signedOutTo="/login">
      <PlayerGate />
    </AppShell>
  );
}

/** Sends the learner back to the topic page unless this video is one they can open. */
function PlayerGate() {
  const params = useParams<{ courseId: string; order: string }>();
  const router = useRouter();
  const { getCourse, isEnrolled, hasAccess, isVideoUnlocked } = useApp();

  const ord = Number(params.order);
  const course = getCourse(params.courseId);
  const video = course?.videos.find((v) => v.order === ord);

  React.useEffect(() => {
    if (!course) return;
    if (!video) {
      router.replace(`/courses/${course.slug}`);
      return;
    }
    if (!isEnrolled(course.id) || !hasAccess(course.id) || !isVideoUnlocked(course.id, ord)) {
      router.replace(`/courses/${course.slug}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, video?.id, ord]);

  if (!course) {
    return (
      <div className="py-20 text-center">
        <p className="font-heading text-xl font-semibold text-heading">Topic not found</p>
        <Link href="/my-topics" className={v2Button("primary", "md", "mt-5")}>
          Back to my topics
        </Link>
      </div>
    );
  }
  if (!video || !isEnrolled(course.id) || !hasAccess(course.id) || !isVideoUnlocked(course.id, ord)) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
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
    isVideoUnlocked,
    videoNotesUrl,
    isCourseComplete,
    myRatingFor,
  } = useApp();

  const [bottomTab, setBottomTab] = React.useState<BottomTab>("notes");
  const [rightTab, setRightTab] = React.useState<"chat" | "notes" | "next">("chat");
  // The player's own reading of the clip length; the stored one is what the admin typed in.
  const [realDuration, setRealDuration] = React.useState<{ videoId: string; seconds: number } | null>(null);
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

  /**
   * Class-notes download.
   *
   * Prefers the file the admin actually uploaded for this lesson (PDF/DOCX/etc,
   * served with its real name and extension). Only when no file exists do we
   * generate a PDF from the summary + transcript. The previous version ignored the
   * upload entirely and always produced a text/plain blob renamed to .txt.
   */
  async function downloadNotes() {
    // The URL is no longer part of the bulk store load, so resolve it for this one
    // video first (returns immediately if it is already known).
    const fileUrl = await videoNotesUrl(video.id);
    if (fileUrl) {
      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = video.notesPdfName ?? `${course.slug}-session-${video.order}-notes`;
      a.rel = "noopener";
      a.click();
      return;
    }
    await downloadLessonNotesPdf(
      course.title,
      video.order,
      video.title,
      video.summary,
      video.transcript,
      video.notesPdfName ?? `${course.slug}-session-${video.order}-notes`,
    );
  }

  const discussionCount = videoCommentsFor(video.id).length;
  const bottomTabs: { id: BottomTab; label: string }[] = [
    { id: "notes", label: "Class notes" },
    { id: "transcript", label: "Transcript" },
    { id: "resources", label: "Resources" },
    { id: "discussion", label: discussionCount > 0 ? `Discussion ${discussionCount}` : "Discussion" },
  ];

  // The rest of the topic, for the "Up next" tab.
  const upNext = course.videos.filter((v) => v.order > video.order).sort((a, b) => a.order - b.order);
  // The last video has nothing after it, so that tab is not offered there.
  const sideTab = rightTab === "next" && upNext.length === 0 ? "chat" : rightTab;
  const durationSeconds = realDuration?.videoId === video.id ? realDuration.seconds : video.durationSeconds;

  return (
    <div className="space-y-6">
      {/* ── Where you are ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            href={`/courses/${course.slug}`}
            className="group inline-flex min-w-0 items-center gap-2 font-semibold text-heading"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-200 ease-out-expo group-hover:-translate-x-1" />
            <span className="truncate">{course.title}</span>
          </Link>
          <span className="shrink-0 font-medium text-muted">
            · Video {video.order} of {prog.total}
          </span>
        </div>
        <Link href={`/courses/${course.slug}`} className={v2Button("outline", "sm")}>
          Back to roadmap
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_416px] lg:items-start xl:grid-cols-[minmax(0,1fr)_448px]">
        {/* ── Left: player + lesson ── */}
        <div className="min-w-0 space-y-6">
          {/* Real Mux playback when the video has a genuine playback id; the seed
              uses "mux_…" placeholders, which fall back to the mock player. */}
          {video.muxPlaybackId && !video.muxPlaybackId.startsWith("mux_") ? (
            <MuxVideoPlayer
              key={video.id}
              course={course}
              video={video}
              learnerId={currentUser?.id}
              onEnded={() => markVideoComplete(video.id)}
              onDuration={(seconds) =>
                setRealDuration((d) =>
                  d?.videoId === video.id && Math.abs(d.seconds - seconds) < 1 ? d : { videoId: video.id, seconds },
                )
              }
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

          <div>
            <h1 className="font-heading text-2xl font-bold leading-[30px] tracking-[-0.015em] text-heading">{video.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[13px] font-medium text-muted">
              <span>
                Video {pad(video.order)} &nbsp;·&nbsp; {formatClock(durationSeconds)}
              </span>
              {completed && (
                <span className={cn(CHIP, "bg-lv-orgs-tint text-lv-orgs-dark")}>
                  <Check className="h-3.5 w-3.5" strokeWidth={3} /> Completed
                </span>
              )}
            </div>
            {video.summary && <p className="mt-3 text-[15px] leading-6 text-v2-body">{video.summary}</p>}

            <div className="mt-4 flex flex-wrap gap-2.5 empty:hidden">
              {!completed && (
                <button type="button" onClick={() => markVideoComplete(video.id)} className={v2Button("primary")}>
                  <Check className="h-4 w-4" /> Mark complete
                </button>
              )}
              {completed && playerNextHref && (
                <Link href={playerNextHref} className={v2Button("primary")}>
                  Next video <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {completed && !playerNextHref && !gateAssignment && (
                <Link href={`/courses/${course.slug}`} className={v2Button("outline")}>
                  Back to roadmap
                </Link>
              )}
            </div>
          </div>

          {/* ── Assignment unlock banner ── */}
          {gateAssignment && completed && (
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-4 rounded-[20px] p-5",
                gateRes?.passed ? "bg-lv-orgs-tint" : "bg-v2-gold-soft",
              )}
            >
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                    gateRes?.passed ? "bg-lv-orgs text-white" : "bg-[#E9B93E] text-navy-800",
                  )}
                >
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold leading-6 text-heading">
                    {gateRes?.passed ? "Checkpoint passed" : "Assignment unlocked"}
                  </p>
                  <p className="text-[13px] font-medium leading-5 text-v2-body">
                    {gateRes?.passed
                      ? `You scored ${gateRes.bestScore}%. The next videos are open.`
                      : "Complete the AI-graded checkpoint to unlock the next videos."}
                  </p>
                </div>
              </div>
              <Link
                href={`/learn/${course.id}/assignment/${gateAssignment.id}`}
                className={v2Button(gateRes?.passed ? "outline" : "primary")}
              >
                {gateRes?.passed ? "Review" : gateRes && gateRes.attempts > 0 ? "Retry assignment" : "Start assignment"}
                {!gateRes?.passed && <ArrowRight className="h-4 w-4" />}
              </Link>
            </div>
          )}

          {/* ── Lesson material ── */}
          <div className="scrollbar-thin overflow-x-auto">
            <SegTabs tabs={bottomTabs} value={bottomTab} onChange={setBottomTab} />
          </div>

          <V2Card className="p-6">
            {bottomTab === "notes" && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-heading text-xl font-semibold leading-[25px] tracking-[-0.015em] text-heading">{video.title}</h2>
                  <button type="button" onClick={downloadNotes} className={v2Button("outline", "sm")}>
                    <Download className="h-3.5 w-3.5" /> Download notes
                  </button>
                </div>
                {video.summary && <p className="mt-4 text-[15px] leading-6 text-v2-body">{video.summary}</p>}
                <ul className="mt-4 space-y-3.5">
                  {video.transcript
                    .split(/(?<=[.!?])\s+/)
                    .filter(Boolean)
                    .slice(0, 4)
                    .map((line, i) => (
                      <li key={i} className="flex gap-3 text-sm font-medium leading-5 text-heading">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lv-self" />
                        {line.trim()}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {bottomTab === "transcript" && (
              <div className="scrollbar-thin max-h-80 overflow-y-auto pr-2">
                <p className="text-[15px] leading-7 text-v2-body">{video.transcript}</p>
                <p className="mt-5 text-xs font-medium text-muted">
                  Transcript auto-syncs with the video when timestamps are available.
                </p>
              </div>
            )}

            {bottomTab === "discussion" && <VideoComments course={course} video={video} hideHeader />}

            {bottomTab === "resources" && (
              <ul className="space-y-1">
                {video.resources.length ? (
                  video.resources.map((r) => (
                    <li key={r.id}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(ROW, "transition-colors duration-200 hover:bg-surface")}
                      >
                        <span className={cn(DOT, "bg-lv-peers-tint text-lv-peers-dark")}>
                          <Paperclip className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-5 text-heading">{r.title}</span>
                          <span className="block text-xs font-medium capitalize text-muted">
                            {r.type}
                            {r.author ? ` · ${r.author}` : ""}
                          </span>
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted" />
                      </a>
                    </li>
                  ))
                ) : (
                  <li className="py-6 text-center text-sm font-medium text-muted">No extra resources for this lesson.</li>
                )}
              </ul>
            )}
          </V2Card>
        </div>

        {/* ── Right: LEAP AI, private notes and the rest of the topic, in one panel that
            stays in view and uses the full height of the window while the lesson scrolls ── */}
        <aside className="min-w-0 lg:sticky lg:top-[84px]">
          <V2Card className="flex h-[560px] flex-col overflow-hidden lg:h-[calc(100dvh-176px)] lg:max-h-[860px] lg:min-h-[min(460px,calc(100dvh-100px))]">
            <div className="shrink-0 space-y-3.5 p-5 pb-3">
              <div className="flex items-center gap-3">
                <LogoMark className="h-10 w-10" />
                <div className="min-w-0">
                  <p className="font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">LEAP AI</p>
                  <p className="text-xs font-medium text-muted">Answers only from this video</p>
                </div>
              </div>
              <SegTabs
                fill
                value={sideTab}
                onChange={setRightTab}
                tabs={[
                  { id: "chat" as const, label: "Ask LEAP AI" },
                  { id: "notes" as const, label: "My notes" },
                  ...(upNext.length > 0 ? [{ id: "next" as const, label: "Up next" }] : []),
                ]}
              />
            </div>

            <div className="min-h-0 flex-1">
              {/* The chat stays mounted behind the other tabs, so the conversation is still there on return. */}
              <div className={cn("h-full", sideTab !== "chat" && "hidden")}>
                <LeapChat course={course} video={video} showHeader={false} />
              </div>
              {sideTab === "chat" ? null : sideTab === "next" ? (
                <div className="scrollbar-thin h-full space-y-1.5 overflow-y-auto px-5 pb-5 pt-1">
                  {upNext.map((v, i) => {
                    const body = (
                      <>
                        <span className={cn(DOT, i === 0 ? "bg-[#E9B93E] text-navy-800" : "bg-surface-2 text-xs font-semibold text-muted")}>
                          {i === 0 ? <Play className="h-3 w-3 fill-current" /> : pad(v.order)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-5 text-heading">{v.title}</p>
                          <p className="text-xs font-medium text-muted">
                            Video {pad(v.order)} &nbsp;·&nbsp; {formatClock(v.durationSeconds)}
                          </p>
                        </div>
                      </>
                    );
                    const row = cn(ROW, i === 0 && "bg-v2-gold-soft");
                    // A video stays locked until the one before it (and any checkpoint) is done.
                    return isVideoUnlocked(course.id, v.order) ? (
                      <Link key={v.id} href={`/learn/${course.id}/${v.order}`} className={cn(row, "transition-colors duration-200", i > 0 && "hover:bg-surface")}>
                        {body}
                      </Link>
                    ) : (
                      <div key={v.id} className={row}>
                        {body}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addNote(video.id, noteText);
                      setNoteText("");
                    }}
                    className="shrink-0 px-5"
                  >
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Jot a private note for this lesson…"
                      aria-label="New note"
                      className="block min-h-[72px] w-full resize-none rounded-2xl bg-surface px-4 py-3 text-sm leading-5 text-heading placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
                    />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <button type="submit" disabled={!noteText.trim()} className={v2Button("strong", "sm")}>
                        Save note
                      </button>
                      {courseNotes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => downloadNotesPdf(course, courseNotes, currentUser?.name)}
                          className={v2Button("ghost", "sm", "px-2")}
                          title="Combine every note you've saved across this topic into one PDF"
                        >
                          <Download className="h-3.5 w-3.5" /> All my notes ({courseNotes.length}) · PDF
                        </button>
                      )}
                    </div>
                  </form>
                  <div className="scrollbar-thin mt-3 flex-1 space-y-2.5 overflow-y-auto px-5 pb-5">
                    {myNotes.length ? (
                      myNotes.map((n) => (
                        <div key={n.id} className="group rounded-2xl bg-surface p-3.5">
                          <p className="whitespace-pre-line text-sm leading-5 text-heading">{n.text}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted">{timeAgo(n.createdAt)}</span>
                            <button
                              type="button"
                              onClick={() => deleteNote(n.id)}
                              className="text-muted opacity-0 transition-all duration-200 hover:text-lv-people-dark focus-visible:opacity-100 group-hover:opacity-100"
                              aria-label="Delete note"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="px-1 py-8 text-center text-sm font-medium text-muted">
                        Your private notes for this lesson will appear here.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </V2Card>
        </aside>
      </div>

      <RatingModal course={course} open={rateOpen} onClose={() => setRateOpen(false)} />
    </div>
  );
}
