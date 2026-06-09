"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Users, BookOpen, ClipboardCheck, Award } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { useApp } from "@/lib/store/AppProvider";
import { ROLES } from "@/lib/types";

const GOLD = "#D49B1E";
const NAVY = "#16305C";
const NAVY_LIGHT = "#2F4D8A";
const GREEN = "#22C55E";
const ORANGE = "#F97316";

export default function AnalyticsPage() {
  return (
    <AdminShell title="Analytics" subtitle="Strategic overview of learning across the platform" requires="owner">
      <Analytics />
    </AdminShell>
  );
}

function Analytics() {
  const { users, courses, enrollments, submissions, progress } = useApp();
  const learners = users.filter((u) => !u.isAdmin);

  // ── enrollments over the last 8 weeks (real, from enrolledAt) ──
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const trend = Array.from({ length: 8 }, (_, i) => {
    const start = now - (8 - i) * WEEK;
    const end = start + WEEK;
    const count = enrollments.filter((e) => {
      const t = new Date(e.enrolledAt).getTime();
      return t >= start && t < end;
    }).length;
    return { label: `W${i + 1}`, signups: count };
  });

  // ── enrollments by path ──
  const byPath = ROLES.map((r) => ({
    name: r.label,
    value: enrollments.filter((e) => courses.find((c) => c.id === e.courseId)?.category === r.id).length,
  }));

  // ── assessment outcomes ──
  const passed = submissions.filter((s) => s.passed).length;
  const failed = Math.max(submissions.length - passed, 0);
  const outcomes = [
    { name: "Passed", value: passed, color: GREEN },
    { name: "Not yet passed", value: failed, color: ORANGE },
  ];
  const passRate = submissions.length ? Math.round((passed / submissions.length) * 100) : 0;

  // ── lessons completed by cohort (real) ──
  const velocity = ROLES.map((r) => {
    const ids = new Set(learners.filter((u) => u.role === r.id).map((u) => u.id));
    const completed = progress.filter((p) => p.completed && ids.has(p.userId)).length;
    return { name: r.label, value: completed };
  });

  const stats = [
    { icon: Users, label: "Total learners", value: learners.length },
    { icon: BookOpen, label: "Total enrollments", value: enrollments.length },
    { icon: ClipboardCheck, label: "Assessment pass rate", value: `${passRate}%` },
    {
      icon: Award,
      label: "Avg. learning credits",
      value: Math.round(learners.reduce((s, u) => s + u.learningCredits, 0) / Math.max(learners.length, 1)),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} padded className="flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-gold-600">
              <s.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading text-2xl font-bold text-heading">{s.value}</p>
              <p className="text-sm text-muted">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card padded className="lg:col-span-2">
          <h2 className="font-heading text-base font-semibold text-heading">Enrollment timeline</h2>
          <p className="text-sm text-muted">Enrollments over the last 8 weeks</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,140,120,0.18)" vertical={false} />
                <XAxis dataKey="label" stroke="#8A97AC" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A97AC" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EEE5D2" }} />
                <Area type="monotone" dataKey="signups" stroke={GOLD} strokeWidth={2.5} fill="url(#gold)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padded>
          <h2 className="font-heading text-base font-semibold text-heading">Assessment outcomes</h2>
          <p className="text-sm text-muted">{passRate}% pass rate</p>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={outcomes} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {outcomes.map((o) => (
                    <Cell key={o.name} fill={o.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EEE5D2" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-sm">
            {outcomes.map((o) => (
              <span key={o.name} className="inline-flex items-center gap-1.5 text-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: o.color }} /> {o.name}
              </span>
            ))}
          </div>
        </Card>

        <Card padded>
          <h2 className="font-heading text-base font-semibold text-heading">Enrollments by path</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPath} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,140,120,0.18)" vertical={false} />
                <XAxis dataKey="name" stroke="#8A97AC" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A97AC" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#FAF5EA" }} contentStyle={{ borderRadius: 12, border: "1px solid #EEE5D2" }} />
                <Bar dataKey="value" fill={NAVY} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padded className="lg:col-span-2">
          <h2 className="font-heading text-base font-semibold text-heading">Lessons completed by cohort</h2>
          <p className="text-sm text-muted">Total lessons completed by each cohort</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocity} layout="vertical" margin={{ left: 30, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,140,120,0.18)" horizontal={false} />
                <XAxis type="number" stroke="#8A97AC" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#8A97AC" fontSize={12} tickLine={false} axisLine={false} width={90} />
                <Tooltip cursor={{ fill: "#FAF5EA" }} contentStyle={{ borderRadius: 12, border: "1px solid #EEE5D2" }} />
                <Bar dataKey="value" fill={GOLD} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
