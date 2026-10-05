"use client";

import * as React from "react";
import Link from "next/link";
import { Check, X, Pencil, ClipboardCheck, Clock } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CourseThumb } from "@/components/CourseThumb";
import { useApp } from "@/lib/store/AppProvider";
import { timeAgo, formatINR } from "@/lib/utils";

export default function ApprovalsPage() {
  return (
    <AdminShell
      title="Approvals"
      subtitle="Review topics submitted by sub-admins before they go live"
      requires="owner"
    >
      <Approvals />
    </AdminShell>
  );
}

function Approvals() {
  const { courses, users, approveCourse, rejectCourse } = useApp();
  const pending = courses
    .filter((c) => c.pendingApproval)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const submitter = (id?: string | null) => users.find((u) => u.id === id)?.name ?? "A sub-admin";

  if (pending.length === 0) {
    return (
      <Card padded>
        <div className="mx-auto max-w-md py-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-green-50 text-green-600">
            <ClipboardCheck className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-heading text-xl font-bold text-heading">All caught up</h2>
          <p className="mt-2 text-sm text-muted">No topics are waiting for approval right now.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-[14px] bg-v2-gold-soft px-4 py-2.5 text-sm font-medium text-heading">
        <Clock className="h-4 w-4 text-gold-600" /> {pending.length} topic{pending.length === 1 ? "" : "s"} awaiting your review.
      </div>

      {pending.map((c) => (
        <Card key={c.id} padded>
          <div className="flex flex-wrap items-start gap-4">
            <CourseThumb accent={c.accent} category={c.category} src={c.thumbnailUrl} rounded="rounded-xl" className="h-16 w-28" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading font-semibold text-heading">{c.title}</h3>
                <Badge variant="warning">Pending review</Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted">
                Submitted by <span className="font-medium text-heading">{submitter(c.submittedBy)}</span> · {timeAgo(c.createdAt)}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-faint">{c.description || "No description."}</p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <li>{c.videos.length} videos</li>
                <li>{c.assignments.length} checkpoints</li>
                <li>{c.price === 0 ? "Free" : formatINR(c.price)}</li>
                <li className="capitalize">{(c.categories ?? [c.category]).join(", ")}</li>
              </ul>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Button size="sm" onClick={() => approveCourse(c.id)}>
                <Check className="h-4 w-4" /> Approve &amp; publish
              </Button>
              <Link
                href={`/admin/courses/${c.id}/edit`}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-v2-line-strong px-3.5 text-[13px] font-semibold text-heading hover:border-heading"
              >
                <Pencil className="h-3.5 w-3.5" /> Review &amp; edit
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Reject "${c.title}"? It stays as a draft for the sub-admin to revise.`)) rejectCourse(c.id);
                }}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-muted hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
