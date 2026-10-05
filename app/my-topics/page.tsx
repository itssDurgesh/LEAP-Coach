"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookMarked, Check, Layers, Play } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CourseThumb } from "@/components/CourseThumb";
import { Bar, LevelChip, PageHead, PillSelect, SegTabs, V2Card, v2Button } from "@/components/v2/ui";
import { levelStyle } from "@/lib/levels";
import { useApp } from "@/lib/store/AppProvider";
import { resumeTarget, type ResumeTarget } from "@/lib/resume";
import { ROLES, ownsTopic, planFor, type Course, type LeadershipTrack, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function MyTopicsPage() {
  return (
    <AppShell>
      <MyTopics />
    </AppShell>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const roleLabel = (r: Role) => ROLES.find((x) => x.id === r)?.label ?? r;

type Filter = "all" | "open" | "done";
type Sort = "recent" | "progress" | "title";

const SORTS: { id: Sort; label: string }[] = [
  { id: "recent", label: "Recently active" },
  { id: "progress", label: "Most progress" },
  { id: "title", label: "Title A to Z" },
];

interface OwnedTopic {
  course: Course;
  completed: number;
  total: number;
  pct: number;
  /** Where the card's button leads: the next video, a pending checkpoint, or the topic page. */
  resume: ResumeTarget;
  lastActive: number;
  expiresAt: string | null;
  expired: boolean;
}

function MyTopics() {
  const app = useApp();
  const { currentUser, courses, tracks, progress, isEnrolled, courseProgress, courseExpiresAt } = app;
  const [filter, setFilter] = React.useState<Filter>("all");
  const [sort, setSort] = React.useState<Sort>("recent");
  if (!currentUser) return null;

  const ownedCategories = currentUser.ownedCategories ?? [];
  const allAccess = currentUser.subscriptionPlan === "all_access";
  const plan = planFor(currentUser);

  // "My topics" = everything the learner has actually acquired: enrolled, bought
  // à-la-carte, unlocked by a category pass, or covered by the all-access plan.
  const owned = courses.filter((c) => ownsTopic(currentUser, c, isEnrolled(c.id)));

  const myProgress = progress.filter((p) => p.userId === currentUser.id);
  const topics: OwnedTopic[] = owned.map((course) => {
    const mine = myProgress.filter((p) => p.courseId === course.id);
    const lastActive = mine.reduce((latest, p) => (p.completedAt ? Math.max(latest, +new Date(p.completedAt)) : latest), 0);
    const expiresAt = courseExpiresAt(course.id);
    return {
      course,
      ...courseProgress(course.id),
      resume: resumeTarget(course, app),
      lastActive,
      expiresAt,
      expired: !!expiresAt && Date.parse(expiresAt) < Date.now(),
    };
  });

  const isDone = (t: OwnedTopic) => t.total > 0 && t.completed === t.total;
  const doneCount = topics.filter(isDone).length;
  const shown = topics
    .filter((t) => filter === "all" || (filter === "done") === isDone(t))
    .sort((a, b) =>
      sort === "title" ? a.course.title.localeCompare(b.course.title) : sort === "progress" ? b.pct - a.pct : b.lastActive - a.lastActive,
    );

  const catalogName = allAccess
    ? "All-access"
    : ownedCategories.length
      ? `${ownedCategories.map(roleLabel).join(" + ")} catalog${ownedCategories.length > 1 ? "s" : ""}`
      : "No catalog yet";

  return (
    <div className="space-y-7">
      <PageHead
        title="My topics"
        description="Every coaching topic you have unlocked, in one place."
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-v2-gold-soft px-3 py-1.5 text-xs font-semibold leading-[18px] text-v2-gold-text">
              <Layers className="h-3.5 w-3.5" /> {catalogName} &nbsp;·&nbsp; {plan.categories} of 3 unlocked
            </span>
            <Link href="/pricing" className={v2Button("outline", "sm")}>
              Upgrade plan <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      {topics.length === 0 ? (
        <V2Card className="px-6 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
            <BookMarked className="h-6 w-6" />
          </span>
          <p className="mt-4 font-heading text-lg font-semibold text-heading">No topics yet</p>
          <p className="mt-1.5 text-sm text-v2-body">
            You haven&rsquo;t unlocked any coaching topics. Explore the catalog to get started.
          </p>
          <Link href="/courses" className={v2Button("primary", "md", "mt-6")}>
            Browse the catalog
          </Link>
        </V2Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SegTabs
              value={filter}
              onChange={setFilter}
              tabs={[
                { id: "all", label: `All ${topics.length}` },
                { id: "open", label: `In progress ${topics.length - doneCount}` },
                { id: "done", label: `Completed ${doneCount}` },
              ]}
            />
            <PillSelect label="Sort topics" value={sort} onChange={setSort} options={SORTS} />
          </div>

          {shown.length === 0 ? (
            <p className="py-12 text-center text-sm font-medium text-muted">
              {filter === "done" ? "You have not finished a topic yet." : "Nothing in progress. Every topic you have is finished."}
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((t) => (
                <OwnedTopicCard key={t.course.id} topic={t} tracks={tracks} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OwnedTopicCard({ topic, tracks }: { topic: OwnedTopic; tracks: LeadershipTrack[] }) {
  const { course: c, completed, total, pct, resume, expiresAt, expired } = topic;
  const s = levelStyle(c.tracks[0]);
  const topicHref = `/courses/${c.slug}`;
  const done = total > 0 && completed === total;

  return (
    <div className="relative flex flex-col overflow-hidden rounded-[24px] bg-card shadow-v2-card transition-all duration-200 ease-out-expo hover:-translate-y-1 hover:shadow-v2-lift">
      <div className="relative">
        <CourseThumb accent={c.accent} category={c.category} title={c.title} src={c.thumbnailUrl} rounded="rounded-none" className="h-[186px] w-full" />
        {done && (
          <span className="absolute right-3.5 top-3.5 inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs font-semibold leading-[18px] text-heading">
            <Check className={cn("h-3 w-3", s.text)} strokeWidth={3} /> Completed
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-[18px]">
        <div className="space-y-2 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <LevelChip trackId={c.tracks[0]} tracks={tracks} />
            <span className="text-xs font-medium text-muted">{c.level}</span>
          </div>
          <h3 className="line-clamp-2 font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">
            {/* The title link stretches over the whole card; the button below sits above it. */}
            <Link href={topicHref} className="after:absolute after:inset-0">
              {c.title}
            </Link>
          </h3>
          <div className="pt-1">
            <Bar pct={pct} className="h-1.5" fillClass={s.base} />
            <div className="mt-1.5 flex items-center justify-between text-xs font-semibold leading-[18px]">
              <span className="text-heading">
                {completed} of {total} videos
              </span>
              <span className={s.text}>{pct}%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={cn("text-xs font-medium", expired ? "text-lv-people-dark" : "text-muted")}>
            {expiresAt && `${expired ? "Access ended" : "Access until"} ${fmtDate(expiresAt)}`}
          </span>
          {resume.kind === "topic" ? (
            // Expired access is renewed on the topic page, a finished topic is reviewed
            // there, and one the learner owns but has not joined is enrolled from there.
            <Link href={topicHref} className={v2Button("outline", "sm", "relative")}>
              {expired ? "Renew" : done ? "Review" : "Open"}
            </Link>
          ) : (
            <Link href={resume.href} className={v2Button("strong", "sm", "relative")}>
              {resume.kind === "checkpoint" ? (
                "Checkpoint"
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" /> {completed > 0 ? "Resume" : "Start"}
                </>
              )}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
