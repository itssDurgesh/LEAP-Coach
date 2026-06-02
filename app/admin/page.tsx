"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  ClipboardCheck,
  CalendarClock,
  Activity,
  Circle,
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

interface FeedEvent {
  id: string;
  name: string;
  text: string;
  at: number;
}

function Overview() {
  const { users, courses, enrollments, submissions, progress, courseProgress } = useApp();

  const learners = users.filter((u) => !u.isAdmin);
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

  // ── live "online now" ticker ──
  const [online, setOnline] = React.useState(() => Math.max(3, Math.round(activeUsers * 0.45)));
  React.useEffect(() => {
    const id = setInterval(() => {
      setOnline((n) => Math.max(2, Math.min(activeUsers, n + (Math.random() > 0.5 ? 1 : -1))));
    }, 2600);
    return () => clearInterval(id);
  }, [activeUsers]);

  // ── live activity feed ──
  const makeEvent = React.useCallback((): FeedEvent => {
    const u = learners[Math.floor(Math.random() * learners.length)];
    const c = courses[Math.floor(Math.random() * courses.length)];
    const v = c.videos[Math.floor(Math.random() * c.videos.length)];
    const templates = [
      `completed “${v.title}”`,
      `enrolled in “${c.title}”`,
      `passed a checkpoint with ${60 + Math.floor(Math.random() * 41)}%`,
      `earned new learning credits`,
      `posted in the community`,
    ];
    return {
      id: Math.random().toString(36).slice(2),
      name: u?.name ?? "A learner",
      text: templates[Math.floor(Math.random() * templates.length)],
      at: Date.now(),
    };
  }, [learners, courses]);

  const [feed, setFeed] = React.useState<FeedEvent[]>([]);
  React.useEffect(() => {
    setFeed(Array.from({ length: 5 }, () => ({ ...makeEvent(), at: Date.now() - Math.random() * 300000 })));
    const id = setInterval(() => setFeed((f) => [makeEvent(), ...f].slice(0, 10)), 3600);
    return () => clearInterval(id);
  }, [makeEvent]);

  const stats = [
    { icon: Users, label: "Active users", value: activeUsers, live: `${online} online now`, color: "text-navy-600 bg-navy-50" },
    { icon: TrendingUp, label: "Avg. completion rate", value: `${completionRate}%`, sub: "across all enrollments", color: "text-green-600 bg-green-50" },
    { icon: ClipboardCheck, label: "Assessments taken", value: submissions.length, sub: "all-time submissions", color: "text-gold-600 bg-gold-50" },
    { icon: CalendarClock, label: "Avg. completion", value: "21 days", sub: "enrollment → finish", color: "text-orange-600 bg-orange-50" },
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
            <p className="mt-3 font-heading text-3xl font-bold text-navy-800">{s.value}</p>
            <p className="text-sm text-ink-soft">{s.label}</p>
            {s.sub && <p className="mt-0.5 text-xs text-ink-faint">{s.sub}</p>}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live activity feed */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-navy-800">
              <Activity className="h-5 w-5 text-gold-600" /> Live activity feed
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" /> Live
            </span>
          </div>
          <ul className="divide-y divide-cream-200">
            {feed.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3 animate-fade-in">
                <Avatar name={e.name} size={34} />
                <p className="flex-1 text-sm text-ink-soft">
                  <span className="font-semibold text-navy-800">{e.name}</span> {e.text}
                </p>
                <span className="text-xs text-ink-faint">{timeAgo(new Date(e.at).toISOString())}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Cohort telemetry */}
        <Card padded>
          <h2 className="font-heading text-base font-semibold text-navy-800">Cohort progress telemetry</h2>
          <div className="mt-5 space-y-5">
            {cohorts.map((c) => (
              <div key={c.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-navy-700">{c.role}</span>
                  <span className="text-ink-faint">
                    {c.learners} learners · <span className="font-semibold text-navy-800">{c.avg}%</span>
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
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
          <h2 className="font-heading text-base font-semibold text-navy-800">Active topic modules</h2>
          <Link href="/admin/courses" className="text-sm font-semibold text-gold-600 hover:text-gold-700">
            Manage
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3 font-medium">Topic</th>
                <th className="px-5 py-3 font-medium">Instructor</th>
                <th className="px-5 py-3 font-medium">Enrolled</th>
                <th className="px-5 py-3 font-medium">Purchases</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {courses.slice(0, 8).map((c) => (
                <tr key={c.id} className="hover:bg-cream-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-navy-800">{c.title}</span>
                      {c.trending && <Badge variant="trending">🔥</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{c.instructorName}</td>
                  <td className="px-5 py-3 text-ink-soft">{c.enrolledCount.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3 text-ink-soft">{c.purchaseCount.toLocaleString("en-IN")}</td>
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
