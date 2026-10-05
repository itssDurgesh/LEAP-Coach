"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { AppShell } from "@/components/app/AppShell";
import { Typewriter } from "@/components/marketing/Typewriter";
import { AlsoInProgress, ContinueCard, type InProgressTopic } from "@/components/dashboard/ContinueCard";
import { AnnouncementBanner, LeadershipMap, NextSessionCard, StandingCard, WisdomCard } from "@/components/dashboard/DashboardCards";
import { ExploreTabs } from "@/components/dashboard/ExploreTabs";
import { IdeaOfTheDay } from "@/components/dashboard/IdeaOfTheDay";
import { UpgradeBand } from "@/components/dashboard/UpgradeBand";
import { isUpcoming } from "@/components/SessionCard";
import { IntroContext, Rise, v2Button } from "@/components/v2/ui";
import { resumeTarget } from "@/lib/resume";
import { useApp } from "@/lib/store/AppProvider";
import { courseCategories, isProfileComplete, missingProfileFields } from "@/lib/types";

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

// The entrance animation plays once per browser session: the first time the
// dashboard is shown after signing in. Later visits render without it.
const INTRO_KEY = "leap-dash-intro";
let introDecision: boolean | null = null;
function decideIntro(): boolean {
  if (introDecision !== null) return introDecision;
  try {
    introDecision = !sessionStorage.getItem(INTRO_KEY);
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    introDecision = false;
  }
  return introDecision;
}

const TWO_COL = "grid gap-6 lg:grid-cols-[minmax(0,1fr)_416px]";

function DashboardContent() {
  const app = useApp();
  const {
    currentUser,
    courses,
    tracks,
    sessions,
    tips,
    resources,
    articles,
    announcements,
    submissions,
    progress,
    isEnrolled,
    courseProgress,
  } = app;
  const reduceMotion = useReducedMotion();
  const [intro] = React.useState(decideIntro);
  React.useEffect(() => {
    // Once the entrance has had time to finish, stop it replaying when the learner
    // navigates away and comes back within the same page lifetime.
    const t = setTimeout(() => {
      introDecision = false;
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  if (!currentUser) return null;
  const role = currentUser.role!;
  const rawFirst = currentUser.name.trim().split(" ")[0] ?? "";
  const firstName = rawFirst ? rawFirst[0].toUpperCase() + rawFirst.slice(1) : rawFirst;
  const headline = firstName ? `Welcome back, ${firstName}` : "Welcome back";

  const enrolledCourses = courses.filter((c) => isEnrolled(c.id));
  const myProgress = progress.filter((p) => p.userId === currentUser.id);

  // Every enrolled topic with its progress, next unwatched video and last activity.
  const topics = enrolledCourses.map((course) => {
    const done = new Set(myProgress.filter((p) => p.courseId === course.id && p.completed).map((p) => p.videoId));
    const nextVideo = [...course.videos].sort((a, b) => a.order - b.order).find((v) => !done.has(v.id)) ?? null;
    const lastActive = myProgress
      .filter((p) => p.courseId === course.id && p.completedAt)
      .reduce((latest, p) => Math.max(latest, +new Date(p.completedAt!)), 0);
    return { course, ...courseProgress(course.id), nextVideo, lastActive, resume: resumeTarget(course, app) };
  });
  // Unfinished topics: started ones first, most recently active first.
  const open: (InProgressTopic & { lastActive: number })[] = topics
    .filter((t) => t.pct < 100)
    .sort((a, b) => Number(b.completed > 0) - Number(a.completed > 0) || b.lastActive - a.lastActive || b.pct - a.pct);
  const [main, second] = open;

  const totals = topics.reduce((acc, t) => ({ done: acc.done + t.completed, all: acc.all + t.total }), { done: 0, all: 0 });
  const overallPct = totals.all ? Math.round((totals.done / totals.all) * 100) : 0;
  const passedCount = submissions.filter((s) => s.userId === currentUser.id && s.passed).length;

  const recommended = courses
    .filter((c) => c.published && courseCategories(c).includes(role) && !isEnrolled(c.id))
    .sort((a, b) => Number(b.trending) - Number(a.trending) || b.rating - a.rating)
    .slice(0, 4);

  const nextSession = sessions
    .filter((s) => (s.targetRole === role || s.targetRole === "all") && isUpcoming(s))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0];

  const roleTips = tips.filter((t) => t.active && (t.targetRole === role || t.targetRole === "all"));
  const tip = roleTips[new Date().getDate() % Math.max(roleTips.length, 1)] ?? roleTips[0];

  const roleResources = resources.filter((r) => r.targetRole === role || r.targetRole === "all").slice(0, 3);

  const latestArticles = articles
    .filter((a) => a.published && !a.archived)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 2);

  const latestAnnouncement = announcements
    .filter((a) => a.published && (a.targetRole === "all" || a.targetRole === role))
    .sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : a.createdAt < b.createdAt ? 1 : -1))[0];

  const profileMissing = missingProfileFields(currentUser);

  let summary = `You have watched ${totals.done} of ${totals.all} videos across your coaching topics.`;
  if (main && main.completed > 0) {
    const left = main.total - main.completed;
    const name = main.course.title.split(":")[0];
    const mins = main.nextVideo ? Math.max(1, Math.round(main.nextVideo.durationSeconds / 60)) : 0;
    summary = `${left} video${left === 1 ? "" : "s"} left in ${name}.${mins ? ` Your next one is ${mins} minute${mins === 1 ? "" : "s"}.` : ""}`;
  } else if (enrolledCourses.length === 0) {
    summary = "Pick a topic from the catalog to get started.";
  }

  const stats: [string, string][] = [
    [`${overallPct}%`, "overall progress"],
    [String(enrolledCourses.length), enrolledCourses.length === 1 ? "topic" : "topics"],
    [String(passedCount), passedCount === 1 ? "assignment passed" : "assignments passed"],
  ];

  return (
    <IntroContext.Provider value={intro}>
      <div className="space-y-10">
        {/* ── Announcement + welcome ── */}
        <div className="space-y-7">
          {latestAnnouncement && (
            <Rise delay={0.05}>
              <AnnouncementBanner announcement={latestAnnouncement} />
            </Rise>
          )}
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              <h1 className="font-heading text-[32px] font-bold leading-[1.15] tracking-[-0.015em] text-heading sm:text-[40px]">
                {intro && !reduceMotion ? <Typewriter text={headline} speed={45} startDelay={300} /> : headline}
              </h1>
              <p className="mt-1.5 text-base leading-6 text-v2-body">{summary}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {stats.map(([value, label], i) => (
                <Rise key={label} delay={0.3 + i * 0.1}>
                  <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 shadow-v2-soft">
                    <span className="font-heading text-lg font-bold leading-6 tracking-[-0.015em] text-heading">{value}</span>
                    <span className="text-[13px] font-medium text-muted">{label}</span>
                  </div>
                </Rise>
              ))}
            </div>
          </div>
        </div>

        {/* ── Complete-your-profile nudge (required before any purchase/upgrade) ── */}
        {!isProfileComplete(currentUser) && (
          <Link
            href="/account"
            className="group flex items-center gap-4 rounded-[20px] bg-v2-gold-soft p-4 transition-shadow duration-200 hover:shadow-v2-soft"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E9B93E] text-navy-800">
              <ClipboardList className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-heading">Complete your profile</p>
              <p className="text-[13px] font-medium text-v2-body">
                Add {profileMissing.join(", ")} to unlock purchases and tailor your experience.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-heading transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        )}

        {/* ── Now: continue + next session, then the second topic ── */}
        <div className="space-y-4">
          <div className={TWO_COL}>
            <Rise delay={0.35} className="min-w-0">
              {main ? (
                <ContinueCard topic={main} tracks={tracks} animate={intro} />
              ) : (
                <div className="flex h-full flex-col justify-center rounded-[24px] bg-v2-navy p-8 shadow-v2-card">
                  <h2 className="font-heading text-[26px] font-bold leading-[1.2] tracking-[-0.015em] text-white">
                    {enrolledCourses.length ? "You are all caught up" : "Pick your first topic"}
                  </h2>
                  <p className="mt-2 text-[15px] leading-6 text-v2-on-navy-muted">
                    {enrolledCourses.length
                      ? "Every topic you have is finished. Find the next one in the catalog."
                      : "Choose a coaching topic and your progress will show up here."}
                  </p>
                  <Link href="/courses" className={v2Button("primary", "md", "mt-5 self-start")}>
                    Browse catalog <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </Rise>
            <Rise delay={0.45}>
              <NextSessionCard session={nextSession} />
            </Rise>
          </div>
          {(second || tip) && (
            <div className={second && tip ? TWO_COL : undefined}>
              {second && (
                <Rise delay={0.6} className="min-w-0">
                  <AlsoInProgress topic={second} tracks={tracks} animate={intro} />
                </Rise>
              )}
              {tip && (
                <Rise delay={0.65}>
                  <WisdomCard tip={tip} />
                </Rise>
              )}
            </div>
          )}
        </div>

        <Rise delay={0.75}>
          <LeadershipMap />
        </Rise>

        {/* ── Today: idea of the day (sample content for now) beside the learner's standing ── */}
        <Rise delay={0.9}>
          <div className={TWO_COL}>
            <IdeaOfTheDay tracks={tracks} />
            <StandingCard
              animate={intro}
              nextUp={main ? { title: main.course.title.split(":")[0], href: `/courses/${main.course.slug}` } : null}
            />
          </div>
        </Rise>

        <Rise delay={1.05}>
          <ExploreTabs topics={recommended} resources={roleResources} articles={latestArticles} tracks={tracks} />
        </Rise>

        <Rise delay={1.2}>
          <UpgradeBand />
        </Rise>
      </div>
    </IntroContext.Provider>
  );
}
