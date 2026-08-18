"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Award,
  ClipboardCheck,
  Quote,
  Sparkles,
  BookMarked,
  Newspaper,
  Megaphone,
  ClipboardList,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Panel } from "@/components/app/Panel";
import { CourseCard } from "@/components/CourseCard";
import { SessionCard } from "@/components/SessionCard";
import { UpgradePlanCard } from "@/components/app/UpgradePlanCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/button-variants";
import { useApp } from "@/lib/store/AppProvider";
import { tierForCredits, courseCategories, articleExcerpt, isProfileComplete, missingProfileFields } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

function SectionHeader({ title, href, cta }: { title: string; href?: string; cta?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="font-heading text-xl font-bold text-heading">{title}</h2>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 font-heading text-sm font-semibold text-gold-700 transition-colors duration-200 hover:text-gold-600"
        >
          {cta ?? "View all"}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const {
    currentUser,
    courses,
    sessions,
    tips,
    resources,
    articles,
    announcements,
    enrollments,
    submissions,
    isEnrolled,
    courseProgress,
  } = useApp();

  if (!currentUser) return null;
  const role = currentUser.role!;
  const rawFirst = currentUser.name.trim().split(" ")[0] ?? "";
  const firstName = rawFirst ? rawFirst[0].toUpperCase() + rawFirst.slice(1) : rawFirst;
  const tier = tierForCredits(currentUser.learningCredits);

  const enrolledCourses = courses.filter((c) => isEnrolled(c.id));
  const withProgress = enrolledCourses
    .map((c) => ({ course: c, ...courseProgress(c.id) }))
    .sort((a, b) => a.pct - b.pct);

  // aggregate progress across enrolled courses
  const totals = enrolledCourses.reduce(
    (acc, c) => {
      const p = courseProgress(c.id);
      return { done: acc.done + p.completed, all: acc.all + p.total };
    },
    { done: 0, all: 0 },
  );
  const overallPct = totals.all ? Math.round((totals.done / totals.all) * 100) : 0;
  const passedCount = submissions.filter((s) => s.userId === currentUser.id && s.passed).length;

  const recommended = courses
    .filter((c) => c.published && courseCategories(c).includes(role) && !isEnrolled(c.id))
    .sort((a, b) => Number(b.trending) - Number(a.trending) || b.rating - a.rating)
    .slice(0, 3);

  const roleSessions = sessions
    .filter((s) => s.targetRole === role || s.targetRole === "all")
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const nextSession = roleSessions[0];

  const roleTips = tips.filter((t) => t.active && (t.targetRole === role || t.targetRole === "all"));
  const tip = roleTips[new Date().getDate() % Math.max(roleTips.length, 1)] ?? roleTips[0];

  const roleResources = resources
    .filter((r) => r.targetRole === role || r.targetRole === "all")
    .slice(0, 3);

  const latestArticles = articles
    .filter((a) => a.published && !a.archived)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 2);

  const latestAnnouncement = announcements
    .filter((a) => a.published && (a.targetRole === "all" || a.targetRole === role))
    .sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : a.createdAt < b.createdAt ? 1 : -1))[0];

  const profileMissing = missingProfileFields(currentUser);

  const stats = [
    { icon: BookOpen, label: "Topics enrolled", value: enrolledCourses.length },
    { icon: Award, label: tier.label, value: currentUser.learningCredits, suffix: "cr" },
    { icon: ClipboardCheck, label: "Assignments passed", value: passedCount },
  ];

  return (
    <div className="space-y-8">
      {/* ── Welcome banner ── */}
      <section className="relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white dark:bg-card sm:p-9">
        {/* Structural texture instead of a blurred corner blob */}
        <div className="pointer-events-none absolute inset-0 texture-rules opacity-[0.07]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 texture-grain opacity-[0.15] mix-blend-overlay"
          aria-hidden
        />

        <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-white/20 bg-white/10 text-cream-100">
                Coachee
              </Badge>
              <Badge variant="gold" className="capitalize">{role}</Badge>
              <Badge variant="outline" className="border-white/20 bg-white/10 text-cream-100">
                {tier.label}
              </Badge>
            </div>
            <h1 className="mt-4 text-balance font-heading text-display-sm font-bold leading-tight">
              Welcome back, {firstName}
            </h1>
            <p className="mt-3 max-w-lg leading-relaxed text-cream-100/70">
              You&rsquo;ve watched {totals.done} of {totals.all || 0} videos across your coaching
              topics. Keep going — your next milestone is not far off.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {withProgress[0] && (
                <Link
                  href={`/courses/${withProgress[0].course.slug}`}
                  className={buttonClasses({ variant: "primary", size: "md", className: "group" })}
                >
                  Continue learning
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
                </Link>
              )}
              <Link
                href="/courses"
                className={buttonClasses({
                  variant: "outline",
                  size: "md",
                  className:
                    "border-white/25 bg-transparent text-white hover:border-white/40 hover:bg-white/10",
                })}
              >
                Browse catalog
              </Link>
            </div>
          </div>

          <div className="shrink-0 self-center rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/15 backdrop-blur">
            <ProgressRing value={overallPct} size={120} stroke={10} label="Overall" />
          </div>
        </div>
      </section>

      {/* ── Complete-your-profile nudge (required before any purchase/upgrade) ── */}
      {!isProfileComplete(currentUser) && (
        <Link
          href="/account"
          className="group flex items-center gap-4 rounded-3xl border border-gold-300 bg-gold-50 p-5 transition-colors duration-200 hover:bg-gold-100/70 dark:border-gold-500/25 dark:bg-gold-500/10"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-500 text-navy-900">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-heading">Complete your profile</p>
            <p className="mt-0.5 text-sm text-muted">
              Add {profileMissing.join(", ")} to unlock purchases and tailor your experience.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-gold-600 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
        </Link>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-y-6 rounded-3xl border border-hair bg-card px-6 py-7 lg:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="border-l border-hair pl-5 [&:nth-child(2n+1)]:border-l-0 [&:nth-child(2n+1)]:pl-0 lg:pl-7 lg:[&:nth-child(2n+1)]:border-l lg:[&:nth-child(2n+1)]:pl-7 lg:[&:nth-child(3n+1)]:border-l-0 lg:[&:nth-child(3n+1)]:pl-0"
          >
            <s.icon className="h-4 w-4 text-gold-600" />
            <p className="mt-3 font-heading text-display-sm font-bold leading-none tabular-nums text-heading">
              {s.value}
              {s.suffix && <span className="ml-1 text-sm font-medium text-faint">{s.suffix}</span>}
            </p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── Main column ── */}
        <div className="min-w-0 space-y-10 lg:col-span-2">
          <section>
            <SectionHeader title="Continue learning" href="/my-topics" cta="My topics" />
            {withProgress.length ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {withProgress.slice(0, 4).map(({ course, pct }) => (
                  <CourseCard key={course.id} course={course} enrolled progressPct={pct} />
                ))}
              </div>
            ) : (
              <Panel className="text-center text-muted">
                You haven&rsquo;t enrolled in any topics yet.{" "}
                <Link href="/courses" className="font-semibold text-gold-700 hover:text-gold-600">
                  Explore the catalog →
                </Link>
              </Panel>
            )}
          </section>

          <section>
            <SectionHeader title="Recommended for you" href="/courses" />
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {recommended.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </section>

          {/* Latest articles from the mentors */}
          {latestArticles.length > 0 && (
            <section>
              <SectionHeader title="Latest articles" href="/articles" cta="All articles" />
              <div className="grid gap-6 sm:grid-cols-2">
                {latestArticles.map((a) => (
                  <Link
                    key={a.id}
                    href={`/articles/${a.id}`}
                    className="group flex h-full flex-col rounded-3xl border border-hair bg-card p-6 transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:border-gold-300 hover:shadow-lift"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 text-gold-400 transition-colors duration-300 group-hover:bg-gold-500 group-hover:text-navy-900 dark:bg-surface-2">
                      <Newspaper className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-heading text-lg font-bold leading-snug text-heading transition-colors duration-200 group-hover:text-gold-700">
                      {a.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                      {articleExcerpt(a)}
                    </p>
                    <p className="mt-auto pt-4 text-xs text-faint">
                      {a.authorName} · {timeAgo(a.createdAt)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="min-w-0 space-y-6">
          {/* Latest announcement */}
          {latestAnnouncement && (
            <Panel className="border-gold-300 dark:border-gold-500/25">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-heading text-base font-bold text-heading">
                  <Megaphone className="h-5 w-5 text-gold-600" /> Announcement
                </h3>
                <Link
                  href="/announcements"
                  className="shrink-0 font-heading text-sm font-semibold text-gold-700 transition-colors duration-200 hover:text-gold-600"
                >
                  All
                </Link>
              </div>
              <p className="mt-3 font-heading font-semibold text-heading">{latestAnnouncement.title}</p>
              <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted">
                {latestAnnouncement.body}
              </p>
              <p className="mt-3 text-xs text-faint">{timeAgo(latestAnnouncement.createdAt)}</p>
            </Panel>
          )}

          {/* Next session */}
          <section>
            <SectionHeader title="Next live session" href="/sessions" />
            {nextSession ? (
              <SessionCard session={nextSession} />
            ) : (
              <Panel className="text-sm text-muted">No upcoming sessions.</Panel>
            )}
          </section>

          {/* Wisdom of the day */}
          {tip && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 p-6 text-navy-900 shadow-gold">
              <Quote className="absolute -right-3 -top-3 h-24 w-24 text-white/20" />
              <div className="relative">
                <p className="inline-flex items-center gap-1.5 font-heading text-[11px] font-bold uppercase tracking-[0.14em]">
                  <Sparkles className="h-4 w-4" /> Wisdom of the day
                </p>
                <p className="mt-4 font-heading text-lg font-semibold leading-snug">
                  &ldquo;{tip.text}&rdquo;
                </p>
                <p className="mt-4 text-sm font-medium text-navy-900/70">— {tip.author}</p>
              </div>
            </div>
          )}

          {/* Recommended resources */}
          {roleResources.length > 0 && (
            <Panel>
              <h3 className="flex items-center gap-2 font-heading text-base font-bold text-heading">
                <BookMarked className="h-5 w-5 text-gold-600" /> Recommended resources
              </h3>
              <ul className="mt-5 border-t border-hair">
                {roleResources.map((r) => (
                  <li key={r.id} className="flex gap-3.5 border-b border-hair py-3.5 last:border-0">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-heading">{r.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        <span className="capitalize">{r.type}</span> · {r.author}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/* Upgrade your plan (buy category passes you don't own yet) */}
          <UpgradePlanCard />
        </aside>
      </div>
    </div>
  );
}
