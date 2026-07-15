"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import Link from "next/link";
import { Search, Ban, ShieldCheck, Shield, Trash2, Eye, MapPin, UserCog } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { SubAdminForm } from "@/components/admin/SubAdminForm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useApp } from "@/lib/store/AppProvider";
import { tierForCredits, isOwner, planFor, PERMISSIONS, User } from "@/lib/types";
import { searchRanked } from "@/lib/search";
import { cn } from "@/lib/utils";

const GOLD = "#D49B1E";
const NAVY = "#16305C";
const COLORS = [NAVY, GOLD, "#2F4D8A", "#E8C056", "#5C77AF"];

export default function UsersPage() {
  return (
    <AdminShell title="Users & Access" subtitle="Manage learners and grant sub-admin access" requires="owner">
      <UsersAdmin />
    </AdminShell>
  );
}

function ageGroup(age?: number) {
  if (!age) return "Unknown";
  if (age < 20) return "Under 20";
  if (age < 30) return "20–29";
  if (age < 40) return "30–39";
  return "40+";
}

function UsersAdmin() {
  const { users, enrollments, setBanned, deleteUser, setSubAdmin, revokeAdmin } = useApp();
  const learners = users.filter((u) => !u.isAdmin);
  const admins = users.filter((u) => u.isAdmin);

  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [sort, setSort] = React.useState("relevance");
  const [viewing, setViewing] = React.useState<User | null>(null);
  const [accessFor, setAccessFor] = React.useState<User | null>(null);

  const enrollCount = (id: string) => enrollments.filter((e) => e.userId === id).length;

  const preFiltered = learners.filter((u) => {
    if (role !== "all" && u.role !== role) return false;
    if (status === "active" && u.banned) return false;
    if (status === "banned" && !u.banned) return false;
    return true;
  });
  // Ranked search by name / username / email relevance (see lib/search.ts).
  const searched = searchRanked(preFiltered, q);
  const filtered =
    sort === "courses"
      ? [...searched].sort((a, b) => enrollCount(b.id) - enrollCount(a.id))
      : sort === "active"
        ? [...searched].sort((a, b) => (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? ""))
        : searched;

  // demographics
  const byGender = ["male", "female", "non_binary", "prefer_not"]
    .map((g) => ({ name: g === "prefer_not" ? "Undisclosed" : g === "non_binary" ? "Non-binary" : g[0].toUpperCase() + g.slice(1), value: learners.filter((u) => (u.gender ?? "prefer_not") === g).length }))
    .filter((d) => d.value > 0);
  const byAge = ["Under 20", "20–29", "30–39", "40+"].map((label) => ({
    name: label,
    value: learners.filter((u) => ageGroup(u.age) === label).length,
  }));
  const byRegion = Object.entries(
    learners.reduce<Record<string, number>>((acc, u) => {
      const r = u.region ?? "Unknown";
      acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Staff access (sub-admins) */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-hair px-5 py-4">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
            <UserCog className="h-5 w-5 text-gold-600" /> Staff access · {admins.length}
          </h2>
          <span className="text-xs text-muted">Promote a learner below to grant sub-admin access</span>
        </div>
        <div className="divide-y divide-hair">
          {admins.map((a) => {
            const owner = isOwner(a);
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Avatar src={a.avatarUrl} name={a.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-heading">{a.name}</p>
                  <p className="text-xs text-faint">{a.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {owner ? (
                    <Badge variant="gold">
                      <ShieldCheck className="h-3 w-3" /> Owner · full access
                    </Badge>
                  ) : (a.permissions ?? []).length ? (
                    (a.permissions ?? []).map((p) => (
                      <Badge key={p} variant="neutral">
                        {PERMISSIONS.find((x) => x.id === p)?.label ?? p}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="warning">No permissions</Badge>
                  )}
                </div>
                {!owner && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => setAccessFor(a)}>
                      Edit access
                    </Button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Revoke sub-admin access for ${a.name}? They become a normal learner.`)) return;
                        const r = await revokeAdmin(a.id);
                        if (!r.ok) alert(r.error ?? "Couldn't revoke access.");
                      }}
                      title="Revoke admin"
                      className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Demographics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card padded>
          <h2 className="font-heading text-base font-semibold text-heading">By gender</h2>
          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byGender} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={3}>
                  {byGender.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EEE5D2" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-muted">
            {byGender.map((g, i) => (
              <span key={g.name} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {g.name}
              </span>
            ))}
          </div>
        </Card>

        <Card padded>
          <h2 className="font-heading text-base font-semibold text-heading">By age group</h2>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byAge} margin={{ left: -22, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,140,120,0.18)" vertical={false} />
                <XAxis dataKey="name" stroke="#8A97AC" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A97AC" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#FAF5EA" }} contentStyle={{ borderRadius: 12, border: "1px solid #EEE5D2" }} />
                <Bar dataKey="value" fill={GOLD} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padded>
          <h2 className="font-heading text-base font-semibold text-heading">Top regions</h2>
          <ul className="mt-4 space-y-3">
            {byRegion.map((r) => {
              const max = byRegion[0]?.value || 1;
              return (
                <li key={r.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-heading">
                      <MapPin className="h-3.5 w-3.5 text-faint" /> {r.name}
                    </span>
                    <span className="font-semibold text-heading">{r.value}</span>
                  </div>
                  <ProgressBar value={(r.value / max) * 100} color="navy" size="sm" />
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* Filters */}
      <Card padded>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username, or email…" className="pl-10" />
          </div>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="sm:w-52">
            <option value="relevance">Sort: Best match</option>
            <option value="courses">Most courses bought</option>
            <option value="active">Most active</option>
          </Select>
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="sm:w-44">
            <option value="all">All roles</option>
            <option value="student">Student</option>
            <option value="professional">Professional</option>
            <option value="entrepreneur">Entrepreneur</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </Select>
        </div>
      </Card>

      {/* Users table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hair text-left text-xs uppercase tracking-wide text-faint">
                <th className="px-5 py-3 font-medium">Learner</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Credits</th>
                <th className="px-5 py-3 font-medium">Topics</th>
                <th className="px-5 py-3 font-medium">Region</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hair">
              {filtered.map((u) => {
                const tier = tierForCredits(u.learningCredits);
                const courses = enrollments.filter((e) => e.userId === u.id).length;
                return (
                  <tr key={u.id} className="hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <Link href={`/admin/users/${encodeURIComponent(u.id)}`} className="group flex items-center gap-3">
                        <Avatar src={u.avatarUrl} name={u.name} size={36} />
                        <div>
                          <p className="font-medium text-heading underline-offset-2 group-hover:text-gold-600 group-hover:underline">{u.name}</p>
                          <p className="text-xs text-faint">{u.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 capitalize text-muted">{u.role}</td>
                    <td className="px-5 py-3">
                      <Badge variant={tier.color}>{u.learningCredits} · {tier.label}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted">{courses}</td>
                    <td className="px-5 py-3 text-muted">{u.region ?? "—"}</td>
                    <td className="px-5 py-3">
                      {u.banned ? <Badge variant="warning">Banned</Badge> : <Badge variant="success">Active</Badge>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewing(u)} title="View" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => setAccessFor(u)} title="Make sub-admin" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-gold-600">
                          <Shield className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            const r = await setBanned(u.id, !u.banned);
                            if (!r.ok) alert(r.error ?? "Couldn't update this account.");
                          }}
                          title={u.banned ? "Unban" : "Ban"}
                          className={cn("grid h-8 w-8 place-items-center rounded-lg hover:bg-surface-2", u.banned ? "text-green-600" : "text-faint hover:text-orange-600")}
                        >
                          {u.banned ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
                            const r = await deleteUser(u.id);
                            if (!r.ok) alert(r.error ?? "Couldn't delete this account.");
                          }}
                          title="Delete"
                          className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted">No learners match your filters.</p>}
        </div>
      </Card>

      {/* View profile modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Learner profile">
        {viewing && <UserProfile user={viewing} />}
      </Modal>

      {/* Sub-admin access modal */}
      <Modal
        open={!!accessFor}
        onClose={() => setAccessFor(null)}
        title={accessFor && accessFor.isAdmin ? "Edit sub-admin access" : "Grant sub-admin access"}
      >
        {accessFor && (
          <SubAdminForm
            user={accessFor}
            onSave={async (perms) => {
              const target = accessFor;
              setAccessFor(null);
              const r = await setSubAdmin(target.id, perms);
              if (!r.ok) alert(r.error ?? "Couldn't save access.");
            }}
            onCancel={() => setAccessFor(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function UserProfile({ user }: { user: User }) {
  const { enrollments, courses, courseProgress } = useApp();
  const tier = tierForCredits(user.learningCredits);
  const myEnrollments = enrollments.filter((e) => e.userId === user.id);

  const facts: [string, string][] = [
    ["Email", user.email],
    ["Phone", `${user.phone ?? "—"}${user.phoneVerified ? " ✓" : ""}`],
    ["Age", user.age ? String(user.age) : "—"],
    ["Gender", user.gender ?? "—"],
    ["Company / College", user.company ?? "—"],
    ["Nationality", user.nationality ?? "—"],
    ["Region", user.region ?? "—"],
    ["Joined", new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-4">
        <Avatar src={user.avatarUrl} name={user.name} size={56} />
        <div>
          <p className="font-heading text-lg font-bold text-heading">{user.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="navy" className="capitalize">{user.role}</Badge>
            <Badge variant={tier.color}>{tier.label} · {user.learningCredits} cr</Badge>
            {user.banned && <Badge variant="warning">Banned</Badge>}
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs uppercase tracking-wide text-faint">{k}</dt>
            <dd className={k === "Email" ? "break-words text-heading" : "capitalize text-heading"}>{v}</dd>
          </div>
        ))}
      </dl>

      {!user.isAdmin && (
        <div className="mt-5 rounded-xl border border-hair bg-surface-2/50 p-4">
          <h3 className="font-heading text-sm font-semibold text-heading">Subscription</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="navy">{planFor(user).label} plan</Badge>
            <span className="text-muted">
              Model: <span className="capitalize text-heading">{user.subscriptionPlan.replace(/_/g, " ")}</span>
            </span>
            {user.subscriptionValidUntil && (
              <span className="text-muted">
                · Valid until {new Date(user.subscriptionValidUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <span>Category passes: <span className="font-medium text-heading">{user.ownedCategories?.length ?? 0}</span></span>
            <span>Topics purchased: <span className="font-medium text-heading">{user.ownedCourseIds.length}</span></span>
            <span>Topics enrolled: <span className="font-medium text-heading">{myEnrollments.length}</span></span>
          </div>
        </div>
      )}

      <h3 className="mt-6 font-heading text-sm font-semibold text-heading">Topic progress</h3>
      <div className="mt-3 space-y-3">
        {myEnrollments.length ? (
          myEnrollments.map((e) => {
            const c = courses.find((x) => x.id === e.courseId);
            if (!c) return null;
            const p = courseProgress(c.id, user.id);
            return (
              <div key={e.courseId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-heading">{c.title}</span>
                  <span className="text-faint">{p.pct}%</span>
                </div>
                <ProgressBar value={p.pct} />
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted">No enrollments yet.</p>
        )}
      </div>
    </div>
  );
}
