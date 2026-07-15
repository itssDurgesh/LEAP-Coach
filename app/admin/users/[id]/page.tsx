"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  CalendarClock,
  ExternalLink,
  IndianRupee,
  Shield,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { SubAdminForm } from "@/components/admin/SubAdminForm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { paymentItemLabel } from "@/components/payments/Receipt";
import { useApp } from "@/lib/store/AppProvider";
import { tierForCredits, isOwner, planFor, PERMISSIONS, Payment } from "@/lib/types";

export default function UserDetailPage() {
  return (
    <AdminShell title="Learner profile" subtitle="Full account, plan, purchases and progress" requires="owner">
      <UserDetail />
    </AdminShell>
  );
}

const fmtDate = (iso: string | null | undefined, withTime = false) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
      })
    : "—";

const GENDER_LABEL: Record<string, string> = {
  male: "Male",
  female: "Female",
  non_binary: "Non-binary",
  prefer_not: "Undisclosed",
};

function PaymentStatusBadge({ p }: { p: Payment }) {
  if (p.status === "refunded") return <Badge variant="warning">Refunded</Badge>;
  if (p.status === "failed") return <Badge variant="warning">Failed</Badge>;
  if (p.grantStatus === "grant_failed") return <Badge variant="warning">Needs attention</Badge>;
  return <Badge variant="success">Paid</Badge>;
}

function UserDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    hydrated,
    users,
    courses,
    enrollments,
    payments,
    courseProgress,
    courseExpiresAt,
    setBanned,
    deleteUser,
    setSubAdmin,
    revokeAdmin,
  } = useApp();
  const [accessOpen, setAccessOpen] = React.useState(false);

  const id = decodeURIComponent(params?.id ?? "");
  const user = users.find((u) => u.id === id);

  if (!user) {
    return (
      <Card padded className="text-center">
        <p className="text-sm text-muted">{hydrated ? "This learner no longer exists." : "Loading profile…"}</p>
        <Link href="/admin/users" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Users & Access
        </Link>
      </Card>
    );
  }

  const tier = tierForCredits(user.learningCredits);
  const plan = planFor(user);
  const myEnrollments = enrollments
    .filter((e) => e.userId === user.id)
    .sort((a, b) => (b.enrolledAt ?? "").localeCompare(a.enrolledAt ?? ""));
  const myPayments = payments
    .filter((p) => p.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ownedTitles = user.ownedCourseIds
    .map((cid) => courses.find((c) => c.id === cid)?.title)
    .filter((t): t is string => !!t);
  const completedCount = myEnrollments.filter((e) => courseProgress(e.courseId, user.id).pct === 100).length;

  const facts: [string, string][] = [
    ["Email", user.email],
    ["Phone", `${user.phone ?? "—"}${user.phoneVerified ? " ✓" : ""}`],
    ["Age", user.age ? String(user.age) : "—"],
    ["Gender", user.gender ? (GENDER_LABEL[user.gender] ?? user.gender) : "—"],
    ["Company / College", user.company ?? "—"],
    ["Nationality", user.nationality ?? "—"],
    ["Region", user.region ?? "—"],
    ["Joined", fmtDate(user.createdAt)],
    ["Last active", fmtDate(user.lastActiveAt, true)],
    ["Username", user.username ? `@${user.username}` : "—"],
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-heading">
        <ArrowLeft className="h-4 w-4" /> Back to Users & Access
      </Link>

      {/* Header */}
      <Card padded>
        <div className="flex flex-wrap items-center gap-5">
          <Avatar src={user.avatarUrl} name={user.name} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl font-bold text-heading">{user.name}</h1>
            <p className="text-sm text-faint">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {user.role && <Badge variant="navy" className="capitalize">{user.role}</Badge>}
              <Badge variant="gold">{plan.label} plan</Badge>
              <Badge variant={tier.color}>{tier.label} · {user.learningCredits} cr</Badge>
              {user.isAdmin && (
                <Badge variant="neutral">
                  <ShieldCheck className="h-3 w-3" /> {isOwner(user) ? "Owner" : "Sub-admin"}
                </Badge>
              )}
              {user.banned && <Badge variant="warning">Banned</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/u/${user.username ?? user.id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" /> Public profile
              </Button>
            </Link>
            {!isOwner(user) && (
              <>
                <Button variant="outline" size="sm" onClick={() => setAccessOpen(true)}>
                  <Shield className="h-4 w-4" /> {user.isAdmin ? "Edit access" : "Make sub-admin"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const r = await setBanned(user.id, !user.banned);
                    if (!r.ok) alert(r.error ?? "Couldn't update this account.");
                  }}
                >
                  <Ban className="h-4 w-4" /> {user.banned ? "Unban" : "Ban"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;
                    const r = await deleteUser(user.id);
                    if (r.ok) router.push("/admin/users");
                    else alert(r.error ?? "Couldn't delete this account.");
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: about + progress + payments */}
        <div className="space-y-6 lg:col-span-2">
          <Card padded>
            <h2 className="font-heading text-base font-semibold text-heading">About</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wide text-faint">{k}</dt>
                  <dd className="break-words text-heading">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-hair px-5 py-4">
              <BookOpen className="h-5 w-5 text-gold-600" />
              <h2 className="font-heading text-base font-semibold text-heading">
                Topic progress · {myEnrollments.length} enrolled, {completedCount} completed
              </h2>
            </div>
            <div className="space-y-4 p-5">
              {myEnrollments.length ? (
                myEnrollments.map((e) => {
                  const c = courses.find((x) => x.id === e.courseId);
                  if (!c) return null;
                  const p = courseProgress(c.id, user.id);
                  const expires = courseExpiresAt(c.id, user.id);
                  return (
                    <div key={e.courseId}>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 text-sm">
                        <span className="font-medium text-heading">{c.title}</span>
                        <span className="text-faint">
                          {p.completed}/{p.total} videos · {p.pct}%
                        </span>
                      </div>
                      <ProgressBar value={p.pct} />
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-faint">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Enrolled {fmtDate(e.enrolledAt)}
                        {expires ? ` · Access until ${fmtDate(expires)}` : " · Lifetime access"}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted">No enrollments yet.</p>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-hair px-5 py-4">
              <IndianRupee className="h-5 w-5 text-gold-600" />
              <h2 className="font-heading text-base font-semibold text-heading">Payments · {myPayments.length}</h2>
            </div>
            {myPayments.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hair text-left text-xs uppercase tracking-wide text-faint">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Item</th>
                      <th className="px-5 py-3 font-medium">Amount</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hair">
                    {myPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-5 py-3 text-muted">{fmtDate(p.createdAt, true)}</td>
                        <td className="px-5 py-3 text-heading">
                          {paymentItemLabel(p, p.courseId ? courses.find((c) => c.id === p.courseId)?.title : undefined)}
                          {p.couponCode && <span className="ml-1.5 text-xs text-faint">({p.couponCode})</span>}
                        </td>
                        <td className="px-5 py-3 font-medium text-heading">₹{p.amountInr.toLocaleString("en-IN")}</td>
                        <td className="px-5 py-3"><PaymentStatusBadge p={p} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted">No payments recorded.</p>
            )}
          </Card>
        </div>

        {/* Right: subscription + access */}
        <div className="space-y-6">
          <Card padded>
            <h2 className="font-heading text-base font-semibold text-heading">Subscription</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="navy">{plan.label} plan</Badge>
              <span className="capitalize text-muted">{user.subscriptionPlan.replace(/_/g, " ")}</span>
            </div>
            {user.subscriptionValidUntil && (
              <p className="mt-2 text-sm text-muted">Valid until {fmtDate(user.subscriptionValidUntil)}</p>
            )}
            <div className="mt-4 space-y-2 text-sm text-muted">
              <p>
                Category passes: <span className="font-medium text-heading">{user.ownedCategories?.length ?? 0}</span>
              </p>
              {(user.ownedCategories ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(user.ownedCategories ?? []).map((cat) => (
                    <Badge key={cat} variant="gold" className="capitalize">{cat}</Badge>
                  ))}
                </div>
              )}
              <p>
                Topics purchased: <span className="font-medium text-heading">{user.ownedCourseIds.length}</span>
              </p>
              {ownedTitles.length > 0 && (
                <ul className="list-inside list-disc space-y-0.5 text-xs text-faint">
                  {ownedTitles.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {user.isAdmin && !isOwner(user) && (
            <Card padded>
              <h2 className="font-heading text-base font-semibold text-heading">Sub-admin access</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(user.permissions ?? []).length ? (
                  (user.permissions ?? []).map((p) => (
                    <Badge key={p} variant="neutral">{PERMISSIONS.find((x) => x.id === p)?.label ?? p}</Badge>
                  ))
                ) : (
                  <Badge variant="warning">No permissions</Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={async () => {
                  if (!confirm(`Revoke sub-admin access for ${user.name}? They become a normal learner.`)) return;
                  const r = await revokeAdmin(user.id);
                  if (!r.ok) alert(r.error ?? "Couldn't revoke access.");
                }}
              >
                Revoke admin access
              </Button>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={accessOpen}
        onClose={() => setAccessOpen(false)}
        title={user.isAdmin ? "Edit sub-admin access" : "Grant sub-admin access"}
      >
        <SubAdminForm
          user={user}
          onSave={async (perms) => {
            setAccessOpen(false);
            const r = await setSubAdmin(user.id, perms);
            if (!r.ok) alert(r.error ?? "Couldn't save access.");
          }}
          onCancel={() => setAccessOpen(false)}
        />
      </Modal>
    </div>
  );
}
