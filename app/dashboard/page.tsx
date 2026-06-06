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
  MessageSquare,
  Heart,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { SessionCard } from "@/components/SessionCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/button-variants";
import { useApp } from "@/lib/store/AppProvider";
import { tierForCredits } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

function SectionHeader({ title, href, cta }: { title: string; href?: string; cta?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-heading text-xl font-bold text-heading">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-gold-600 hover:text-gold-700">
          {cta ?? "View all"} <ArrowRight className="h-4 w-4" />
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
    community,
    enrollments,
    submissions,
    isEnrolled,
    courseProgress,
  } = useApp();

  if (!currentUser) return null;
  const role = currentUser.role!;
  const firstName = currentUser.name.split(" ")[0];
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
    .filter((c) => c.published && c.category === role && !isEnrolled(c.id))
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

  const recentPosts = community.slice(0, 3);

  const stats = [
    { icon: BookOpen, label: "Topics enrolled", value: enrolledCourses.length },
    { icon: Award, label: tier.label, value: currentUser.learningCredits, suffix: "cr" },
    { icon: ClipboardCheck, label: "Assignments passed", value: passedCount },
  ];

  return (
    <div className="space-y-7">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 to-navy-950 dark:from-card dark:to-surface p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-white/20 bg-white/10 text-cream-100">
                Coachee
              </Badge>
              <Badge variant="gold" className="capitalize">{role}</Badge>
              <Badge variant="outline" className="border-white/20 bg-white/10 text-cream-100">
                {tier.label}
              </Badge>
            </div>
            <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">
              Welcome back, {firstName} Coachee
            </h1>
            <p className="mt-2 max-w-lg text-cream-100/75">
              You&rsquo;ve watched {totals.done} of {totals.all || 0} videos across your coaching
              topics. Keep going — your next milestone is closer than you think.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {withProgress[0] && (
                <Link
                  href={`/courses/${withProgress[0].course.slug}`}
                  className={buttonClasses({ variant: "primary", size: "md" })}
                >
                  Continue learning <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                href="/courses"
                className={buttonClasses({
                  variant: "outline",
                  size: "md",
                  className: "border-white/25 bg-transparent text-white hover:bg-white/10",
                })}
              >
                Browse catalog
              </Link>
            </div>
          </div>
          <div className="shrink-0 self-center rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <ProgressRing value={overallPct} size={120} stroke={10} label="Overall" />
          </div>
        </div>
      </section>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} padded className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-gold-600">
              <s.icon className="h-6 w-6" />
            </span>
            <div>
              <p className="font-heading text-2xl font-bold text-heading">
                {s.value}
                {s.suffix && <span className="ml-1 text-sm font-medium text-faint">{s.suffix}</span>}
              </p>
              <p className="text-sm text-muted">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-7 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-8 lg:col-span-2">
          <section>
            <SectionHeader title="Continue learning" href="/courses" cta="My topics" />
            {withProgress.length ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {withProgress.slice(0, 4).map(({ course, pct }) => (
                  <CourseCard key={course.id} course={course} enrolled progressPct={pct} />
                ))}
              </div>
            ) : (
              <Card padded className="text-center text-muted">
                You haven&rsquo;t enrolled in any topics yet.{" "}
                <Link href="/courses" className="font-semibold text-gold-600">Explore the catalog →</Link>
              </Card>
            )}
          </section>

          <section>
            <SectionHeader title="Recommended for you" href="/courses" />
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {recommended.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Next session */}
          <section>
            <SectionHeader title="Next live session" href="/sessions" />
            {nextSession ? (
              <SessionCard session={nextSession} />
            ) : (
              <Card padded className="text-sm text-muted">No upcoming sessions.</Card>
            )}
          </section>

          {/* Wisdom of the day */}
          {tip && (
            <Card className="relative overflow-hidden bg-gradient-to-br from-gold-400 to-gold-600 p-6 text-navy-900">
              <Quote className="absolute -right-2 -top-2 h-20 w-20 text-white/20" />
              <div className="relative">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                  <Sparkles className="h-4 w-4" /> Wisdom of the Day
                </p>
                <p className="mt-3 font-heading text-lg font-semibold leading-snug">
                  &ldquo;{tip.text}&rdquo;
                </p>
                <p className="mt-3 text-sm text-navy-900/70">— {tip.author}</p>
              </div>
            </Card>
          )}

          {/* Recommended resources */}
          <Card padded>
            <h3 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
              <BookMarked className="h-5 w-5 text-gold-600" /> Recommended resources
            </h3>
            <ul className="mt-4 space-y-3">
              {roleResources.map((r) => (
                <li key={r.id} className="flex gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-heading">{r.title}</p>
                    <p className="text-xs text-muted">
                      <span className="capitalize">{r.type}</span> · {r.author}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Community preview */}
          <Card padded>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
                <MessageSquare className="h-5 w-5 text-gold-600" /> Community
              </h3>
              <Link href="/community" className="text-sm font-semibold text-gold-600 hover:text-gold-700">
                Open
              </Link>
            </div>
            <ul className="mt-4 space-y-4">
              {recentPosts.map((p) => (
                <li key={p.id} className="flex gap-3">
                  <Avatar name={p.userName} size={32} />
                  <div className="min-w-0">
                    <p className="text-xs text-faint">
                      <span className="font-semibold text-heading">{p.userName}</span> · {timeAgo(p.createdAt)}
                    </p>
                    <p className="line-clamp-2 text-sm text-muted">{p.text}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-faint">
                      <Heart className="h-3 w-3" /> {p.likedBy.length}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
