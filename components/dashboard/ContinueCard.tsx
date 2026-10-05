"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, Play } from "lucide-react";
import { CourseThumb } from "@/components/CourseThumb";
import { Bar, LevelChip, v2Button } from "@/components/v2/ui";
import { levelStyle } from "@/lib/levels";
import type { ResumeTarget } from "@/lib/resume";
import type { Course, LeadershipTrack, Video } from "@/lib/types";

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

/** The main "pick up where you stopped" card at the top of the dashboard. */
export function ContinueCard({ topic, tracks, animate }: { topic: InProgressTopic; tracks: LeadershipTrack[]; animate?: boolean }) {
  const { course, completed, total, pct, nextVideo, resume } = topic;

  return (
    <div className="relative flex h-full flex-col gap-6 overflow-hidden rounded-[24px] bg-v2-navy p-6 shadow-v2-card sm:flex-row sm:items-center sm:gap-7">
      {/* Decorative circles, clipped by the card. */}
      <span aria-hidden className="pointer-events-none absolute -right-[130px] -top-[190px] h-[260px] w-[260px] rounded-full bg-gold-400/20" />
      <span aria-hidden className="pointer-events-none absolute -bottom-[100px] -right-[60px] h-[170px] w-[170px] rounded-full bg-lv-self/30" />

      <CourseThumb
        accent={course.accent}
        category={course.category}
        title={course.title}
        src={course.thumbnailUrl}
        rounded="rounded-2xl"
        className="relative aspect-[16/10] w-full shrink-0 sm:w-[288px]"
      />

      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <LevelChip trackId={course.tracks[0]} tracks={tracks} />
          <span className="text-[13px] font-medium text-v2-on-navy-muted">
            {completed > 0 ? "Continue where you stopped" : "Ready when you are"}
          </span>
        </div>
        <h2 className="mt-3.5 font-heading text-[26px] font-bold leading-[1.2] tracking-[-0.015em] text-white">
          {course.title}
        </h2>
        {nextVideo && (
          <p className="mt-3.5 text-sm text-v2-on-navy-muted">
            Next: {nextVideo.title} &nbsp;·&nbsp; {minutes(nextVideo.durationSeconds)}
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
  const { course, completed, total, pct, nextVideo, resume } = topic;
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
              Next: {nextVideo.title} · {minutes(nextVideo.durationSeconds)}
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
