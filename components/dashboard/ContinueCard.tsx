"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, Play } from "lucide-react";
import { CourseThumb } from "@/components/CourseThumb";
import { Bar, LevelChip, v2Button } from "@/components/v2/ui";
import { levelStyle } from "@/lib/levels";
import type { ResumeTarget } from "@/lib/resume";
import type { Course, LeadershipTrack, Video } from "@/lib/types";
import { formatClock } from "@/lib/utils";

export interface InProgressTopic {
  course: Course;
  completed: number;
  total: number;
  pct: number;
  /** First video not yet completed; null when every video is done. */
  nextVideo: Video | null;
  /** Where the resume button leads: the next video, a pending checkpoint, or the topic page. */
  resume: ResumeTarget;
}

const RESUME_LABEL = { video: "Resume", checkpoint: "Checkpoint", topic: "Open" } as const;

const minutes = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;

/** The video the button opens and where in it the learner stopped (0 = from the start). */
function resumePoint(topic: InProgressTopic): { video: Video | null; at: number } {
  const { resume, nextVideo } = topic;
  if (resume.kind === "video" && resume.video) return { video: resume.video, at: resume.positionSeconds ?? 0 };
  return { video: nextVideo, at: 0 };
}

/** The main "pick up where you stopped" card at the top of the dashboard. */
export function ContinueCard({ topic, tracks, animate }: { topic: InProgressTopic; tracks: LeadershipTrack[]; animate?: boolean }) {
  const { course, completed, total, pct, resume } = topic;
  const { video, at } = resumePoint(topic);
  const midway = at > 0 && !!video;
  // Resuming a video shows the topic's video thumbnail when the admin set one.
  const cover = resume.kind === "video" && course.videoThumbnailUrl ? course.videoThumbnailUrl : course.thumbnailUrl;

  return (
    <div className="relative flex h-full flex-col gap-6 overflow-hidden rounded-[24px] bg-v2-navy p-6 shadow-v2-card sm:flex-row sm:items-center sm:gap-7">
      {/* Decorative circles, clipped by the card. */}
      <span aria-hidden className="pointer-events-none absolute -right-[130px] -top-[190px] h-[260px] w-[260px] rounded-full bg-gold-400/20" />
      <span aria-hidden className="pointer-events-none absolute -bottom-[100px] -right-[60px] h-[170px] w-[170px] rounded-full bg-lv-self/30" />

      <Link href={resume.href} aria-label={midway ? `Resume ${video!.title}` : `Open ${course.title}`} className="group/thumb relative block w-full shrink-0 sm:w-[288px]">
        <CourseThumb
          accent={course.accent}
          category={course.category}
          title={course.title}
          src={cover}
          rounded="rounded-2xl"
          className="relative aspect-[16/10] w-full"
        />
        {resume.kind === "video" && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#E9B93E] text-navy-800 shadow-gold transition-transform duration-300 ease-out-expo group-hover/thumb:scale-110">
              <Play className="ml-0.5 h-6 w-6 fill-current" />
            </span>
          </span>
        )}
        {midway && video!.durationSeconds > 0 && (
          // How far into this video the learner got.
          <span aria-hidden className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-white/30">
            <span className="block h-full rounded-full bg-[#E9B93E]" style={{ width: `${Math.min(100, (at / video!.durationSeconds) * 100)}%` }} />
          </span>
        )}
      </Link>

      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <LevelChip trackId={course.tracks[0]} tracks={tracks} />
          <span className="text-[13px] font-medium text-v2-on-navy-muted">
            {completed > 0 || midway ? "Continue where you stopped" : "Ready when you are"}
          </span>
        </div>
        <h2 className="mt-3.5 font-heading text-[26px] font-bold leading-[1.2] tracking-[-0.015em] text-white">
          {course.title}
        </h2>
        {video && (
          <p className="mt-3.5 text-sm text-v2-on-navy-muted">
            {midway ? (
              <>
                Resume: {video.title} &nbsp;·&nbsp; from {formatClock(at)}
                {video.durationSeconds > 0 && ` of ${formatClock(video.durationSeconds)}`}
              </>
            ) : (
              <>
                Next: {video.title} &nbsp;·&nbsp; {minutes(video.durationSeconds)}
              </>
            )}
          </p>
        )}
        <div className="mt-3.5 flex items-center gap-3">
          <Bar pct={pct} animate={animate} className="flex-1" trackClass="bg-v2-navy-raised" />
          <span className="shrink-0 text-[13px] font-semibold text-white">
            {completed} of {total} videos
          </span>
        </div>
        <div className="mt-[18px] flex flex-wrap items-center gap-3.5">
          <Link href={resume.href} className={v2Button("primary")}>
            {resume.kind === "video" && <Play className="h-4 w-4 fill-current" />}
            {resume.kind === "checkpoint" && <ClipboardCheck className="h-4 w-4" />}
            {resume.kind === "checkpoint"
              ? "Take the checkpoint"
              : resume.kind === "topic"
                ? "Open topic"
                : midway
                  ? `Resume at ${formatClock(at)}`
                  : completed > 0
                    ? "Resume video"
                    : "Start topic"}
          </Link>
          <Link href={`/courses/${course.slug}`} className={v2Button("ghostOnNavy", "md", "px-2")}>
            Topic overview <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Slim card for a second topic the learner has started. */
export function AlsoInProgress({ topic, tracks, animate }: { topic: InProgressTopic; tracks: LeadershipTrack[]; animate?: boolean }) {
  const { course, completed, total, pct, resume } = topic;
  const { video: nextVideo, at } = resumePoint(topic);
  const s = levelStyle(course.tracks[0]);
  return (
    <div className="flex h-full flex-wrap items-center gap-4 rounded-[20px] bg-card py-3.5 pl-3.5 pr-5 shadow-v2-soft">
      <CourseThumb
        accent={course.accent}
        category={course.category}
        title={course.title}
        src={course.thumbnailUrl}
        rounded="rounded-xl"
        className="h-[65px] w-[104px] shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-heading">{course.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <LevelChip trackId={course.tracks[0]} tracks={tracks} />
          {nextVideo && (
            <span className="truncate text-xs font-medium text-muted">
              {at > 0 ? `Stopped at ${formatClock(at)} in ${nextVideo.title}` : `Next: ${nextVideo.title} · ${minutes(nextVideo.durationSeconds)}`}
            </span>
          )}
        </div>
      </div>
      <div className="w-[170px] shrink-0">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-heading">
            {completed} of {total} videos
          </span>
          <span className={s.text}>{pct}%</span>
        </div>
        <Bar pct={pct} animate={animate} className="mt-1.5 h-1.5" fillClass={s.base} />
      </div>
      <Link href={resume.href} className={v2Button("outline", "sm")}>
        {resume.kind === "video" && <Play className="h-3.5 w-3.5 fill-current" />} {RESUME_LABEL[resume.kind]}
      </Link>
    </div>
  );
}
