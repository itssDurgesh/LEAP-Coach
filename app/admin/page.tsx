"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  ClipboardCheck,
  CalendarClock,
  ShoppingCart,
  ArrowUpRight,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/lib/store/AppProvider";
import { ROLES } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export default function AdminOverviewPage() {
  return (
    <AdminShell title="Command Center" subtitle="Real-time overview of your learning platform">
      <Overview />
    </AdminShell>
  );
}

function Overview() {
  const { users, courses, enrollments, submissions, progress, courseProgress } = useApp();

  // Memoized so `makeEvent`'s useCallback (and the feed effect) stays stable across renders —
  // a fresh array each render would re-fire the effect's setFeed and cause an infinite loop.
  const learners = React.useMemo(() => users.filter((u) => !u.isAdmin), [users]);
  const activeUsers = learners.filter((u) => !u.banned).length;

  // completion rate across all enrollments
  const rates = enrollments.map((e) => courseProgress(e.courseId, e.userId).pct);
  const completionRate = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;

  const cohorts = ROLES.map((r) => {
    const roleUsers = learners.filter((u) => u.role === r.id);
    const userRates = roleUsers.flatMap((u) =>
      enrollments.filter((e) => e.userId === u.id).map((e) => courseProgress(e.courseId, u.id).pct),
    );
    const avg = userRates.length ? Math.round(userRates.reduce((a, b) => a + b, 0) / userRates.length) : 0;
    return { role: r.label, id: r.id, learners: roleUsers.length, avg };
  });

  // ── real activity (from lastActiveAt + progress) ──
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const activeThisWeek = learners.filter(
    (u) => !u.banned && Date.now() - new Date(u.lastActiveAt).getTime() < WEEK,
  ).length;
  const lessonsCompleted = progress.filter((p) => p.completed).length;

  // ── recent course purchases (real data: who bought which topic) ──
  const purchases = React.useMemo(() => {
    const enrolledAt = new Map(enrollments.map((e) => [`${e.userId}|${e.courseId}`, e.enrolledAt]));
    const titleOf = new Map(courses.map((c) => [c.id, c.title]));
    return learners
      .flatMap((u) =>
        u.ownedCourseIds
          .filter((cid) => titleOf.has(cid))
          .map((cid) => ({
            id: `${u.id}_${cid}`,
            name: u.name,
            course: titleOf.get(cid) as string,
            at: enrolledAt.get(`${u.id}|${cid}`) ?? u.createdAt,
          })),
      )
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [learners, courses, enrollments]);

  const stats = [
    { icon: Users, label: "Active users", value: activeUsers, live: `${activeThisWeek} active this week`, color: "text-navy-600 bg-navy-50" },
    { icon: TrendingUp, label: "Avg. completion rate", value: `${completionRate}%`, sub: "across all enrollments", color: "text-green-600 bg-green-50" },
    { icon: ClipboardCheck, label: "Assessments taken", value: submissions.length, sub: "all-time submissions", color: "text-gold-600 bg-gold-50" },
    { icon: CalendarClock, label: "Lessons completed", value: lessonsCompleted, sub: "all-time, all learners", color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} padded>
            <div className="flex items-start justify-between">
              <span className={cn("grid h-11 w-11 place-items-center rounded-xl", s.color)}>
                <s.icon className="h-5 w-5" />
              </span>
              {s.live && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  {s.live}
                </span>
              )}
            </div>
            <p className="mt-3 font-heading text-3xl font-bold text-heading">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
            {s.sub && <p className="mt-0.5 text-xs text-faint">{s.sub}</p>}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent course purchases */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-hair px-5 py-4">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
              <ShoppingCart className="h-5 w-5 text-gold-600" /> Recent course purchases
            </h2>
            <span className="text-xs font-medium text-faint">{purchases.length} total</span>
          </div>
          {purchases.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-faint">No course purchases yet.</p>
          ) : (
            <ul className="divide-y divide-hair">
              {purchases.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={p.name} size={34} />
                  <p className="flex-1 text-sm text-muted">
                    <span className="font-semibold text-heading">{p.name}</span> purchased{" "}
                    <span className="font-medium text-heading">“{p.course}”</span>
                  </p>
                  <span className="text-xs text-faint">{timeAgo(new Date(p.at).toISOString())}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Cohort telemetry */}
        <Card padded>
          <h2 className="font-heading text-base font-semibold text-heading">Cohort progress telemetry</h2>
          <div className="mt-5 space-y-5">
            {cohorts.map((c) => (
              <div key={c.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-heading">{c.role}</span>
                  <span className="text-faint">
                    {c.learners} learners · <span className="font-semibold text-heading">{c.avg}%</span>
                  </span>
                </div>
                <ProgressBar value={c.avg} />
              </div>
            ))}
          </div>
          <Link
            href="/admin/analytics"
            className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-gold-600 hover:text-gold-700"
          >
            View full analytics <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>

      {/* Active topic modules */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-hair px-5 py-4">
          <h2 className="font-heading text-base font-semibold text-heading">Active topic modules</h2>
          <Link href="/admin/courses" className="text-sm font-semibold text-gold-600 hover:text-gold-700">
            Manage
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hair text-left text-xs uppercase tracking-wide text-faint">
                <th className="px-5 py-3 font-medium">Topic</th>
                <th className="px-5 py-3 font-medium">Instructor</th>
                <th className="px-5 py-3 font-medium">Enrolled</th>
                <th className="px-5 py-3 font-medium">Purchases</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hair">
              {courses.slice(0, 8).map((c) => (
                <tr key={c.id} className="hover:bg-surface-2">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-heading">{c.title}</span>
                      {c.trending && <Badge variant="trending">🔥</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted">{c.instructorName}</td>
                  <td className="px-5 py-3 text-muted">{c.enrolledCount.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3 text-muted">{c.purchaseCount.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3">
                    {c.published ? (
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="warning">Draft</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
