"use client";

import * as React from "react";
import { Megaphone, Plus, Trash2, Pin, Eye, EyeOff, Pencil, Send, Check, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { Announcement, Role } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export default function AdminAnnouncementsPage() {
  return (
    <AdminShell title="Announcements" subtitle="Broadcast updates to your learners" requires="announcements">
      <Announcements />
    </AdminShell>
  );
}

const newId = () => `an_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const audienceLabel = (r: Announcement["targetRole"]) =>
  r === "all" ? "all learners" : `all ${r}s`;

/** Send a test copy to the calling admin (uses the composed draft, not persisted). */
async function requestTest(a: Pick<Announcement, "title" | "body" | "targetRole">) {
  const res = await fetch("/api/admin/email/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "announcement", title: a.title, body: a.body, targetRole: a.targetRole, test: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not send the test email.");
  return "Test email sent to your inbox.";
}

interface SendReport {
  msg: string;
  notifiedAt: string | null;
  notifiedUserIds: string[];
}

/**
 * Notify the announcement's audience by id. By default the server emails only those
 * who haven't received it yet (retry-safe); resendAll re-blasts everyone.
 */
async function requestSend(id: string, resendAll: boolean): Promise<SendReport> {
  const res = await fetch("/api/admin/email/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "announcement", id, resendAll }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not send emails.");
  const base = { notifiedAt: data.notifiedAt ?? null, notifiedUserIds: data.notifiedUserIds ?? [] };
  if (data.nothingToSend) {
    return { ...base, msg: `Everyone in the audience (${data.totalEligible}) has already received this.` };
  }
  const reason = data.failedNow && data.errors?.length ? ` — e.g. ${data.errors[0]}` : "";
  const remain = data.remaining ? ` · ${data.remaining} still not reached` : "";
  const failed = data.failedNow ? ` · ${data.failedNow} failed${reason}` : "";
  return { ...base, msg: `Delivered to ${data.deliveredNow} of ${data.totalEligible}${failed}${remain}.` };
}

function Announcements() {
  const { announcements, users, currentUser, saveAnnouncement, deleteAnnouncement, markAnnouncementNotified } = useApp();
  const [editing, setEditing] = React.useState<Announcement | null>(null);
  const [composing, setComposing] = React.useState(false);
  const [toast, setToast] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const [sendingId, setSendingId] = React.useState<string | null>(null);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 7000);
  };

  // Approx size of the audience that could receive an email (learners in this role,
  // not banned/admin). The exact delivered/remaining numbers come from the send response.
  const audienceSize = (targetRole: Announcement["targetRole"]) =>
    users.filter((u) => !u.isAdmin && !u.banned && (targetRole === "all" || u.role === targetRole)).length;

  async function emailAnnouncement(a: Announcement, resendAll = false) {
    setSendingId(a.id);
    try {
      const { msg, notifiedAt, notifiedUserIds } = await requestSend(a.id, resendAll);
      markAnnouncementNotified(a.id, notifiedAt, notifiedUserIds);
      showToast(true, msg);
    } catch (e) {
      showToast(false, e instanceof Error ? e.message : "Could not send emails.");
    } finally {
      setSendingId(null);
    }
  }

  const sorted = [...announcements].sort((a, b) =>
    a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : a.createdAt < b.createdAt ? 1 : -1,
  );

  const touch = (a: Announcement, patch: Partial<Announcement>) =>
    saveAnnouncement({ ...a, ...patch, updatedAt: new Date().toISOString() });

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={
            toast.ok
              ? "flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700"
              : "flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700"
          }
        >
          {toast.ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />} {toast.msg}
        </div>
      )}

      {!composing && !editing && (
        <div className="flex justify-end">
          <Button onClick={() => setComposing(true)}>
            <Plus className="h-4 w-4" /> New announcement
          </Button>
        </div>
      )}

      {(composing || editing) && (
        <Form
          key={editing?.id ?? "new"}
          initial={editing}
          authorName={currentUser?.name ?? "Admin"}
          authorId={currentUser?.id ?? ""}
          sendingTest={sendingId === "test"}
          onTest={async (draft) => {
            setSendingId("test");
            try {
              showToast(true, await requestTest(draft));
            } catch (e) {
              showToast(false, e instanceof Error ? e.message : "Could not send the test email.");
            } finally {
              setSendingId(null);
            }
          }}
          onCancel={() => {
            setComposing(false);
            setEditing(null);
          }}
          onSave={(a, emailIt) => {
            saveAnnouncement(a);
            setComposing(false);
            setEditing(null);
            if (emailIt && a.published) void emailAnnouncement(a);
          }}
        />
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-hair px-5 py-4">
          <Megaphone className="h-5 w-5 text-gold-600" />
          <h2 className="font-heading text-base font-semibold text-heading">All announcements · {announcements.length}</h2>
        </div>
        {sorted.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-faint">No announcements yet. Post your first above.</p>
        ) : (
          <ul className="divide-y divide-hair">
            {sorted.map((a) => {
              const done = a.notifiedUserIds?.length ?? 0;
              const total = audienceSize(a.targetRole);
              const allDone = done > 0 && done >= total;
              return (
              <li key={a.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-heading">{a.title}</span>
                    {a.pinned && (
                      <Badge variant="gold">
                        <Pin className="h-3 w-3" /> Pinned
                      </Badge>
                    )}
                    {!a.published && <Badge variant="neutral">Draft</Badge>}
                    {a.targetRole !== "all" && (
                      <Badge variant="neutral" className="capitalize">
                        {a.targetRole}s
                      </Badge>
                    )}
                    {done > 0 && (
                      <Badge variant={allDone ? "success" : "gold"}>
                        <Check className="h-3 w-3" /> {done}/{total} emailed
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted">{a.body}</p>
                  <p className="text-xs text-faint">
                    {a.authorName} · {timeAgo(a.createdAt)}
                    {a.notifiedAt && ` · first emailed ${timeAgo(a.notifiedAt)}`}
                    {done > 0 && !allDone && ` · ${total - done} not yet reached`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {a.published && (
                    <button
                      onClick={() => {
                        const audience = audienceLabel(a.targetRole);
                        if (done === 0) {
                          if (confirm(`Email "${a.title}" to ${audience} (${total})?`)) void emailAnnouncement(a, false);
                        } else if (!allDone) {
                          if (confirm(`Retry: email the ${total - done} learner${total - done === 1 ? "" : "s"} who haven't received "${a.title}" yet?`))
                            void emailAnnouncement(a, false);
                        } else if (confirm(`Everyone (${total}) has already received "${a.title}". Re-send to all again?`)) {
                          void emailAnnouncement(a, true);
                        }
                      }}
                      disabled={sendingId === a.id}
                      title={done === 0 ? "Email to audience" : allDone ? "All emailed — re-send to everyone" : `Retry — ${total - done} not yet reached`}
                      className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-gold-600 disabled:opacity-50"
                    >
                      {sendingId === a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : done === 0 ? (
                        <Send className="h-4 w-4" />
                      ) : allDone ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <RefreshCw className="h-4 w-4 text-gold-600" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => touch(a, { pinned: !a.pinned })}
                    title={a.pinned ? "Unpin" : "Pin"}
                    className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-gold-600"
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => touch(a, { published: !a.published })}
                    title={a.published ? "Unpublish" : "Publish"}
                    className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading"
                  >
                    {a.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setComposing(false);
                      setEditing(a);
                    }}
                    title="Edit"
                    className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this announcement?")) deleteAnnouncement(a.id);
                    }}
                    title="Delete"
                    className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Form({
  initial,
  authorName,
  authorId,
  sendingTest,
  onTest,
  onSave,
  onCancel,
}: {
  initial: Announcement | null;
  authorName: string;
  authorId: string;
  sendingTest: boolean;
  onTest: (draft: Pick<Announcement, "title" | "body" | "targetRole">) => void;
  onSave: (a: Announcement, emailIt: boolean) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [body, setBody] = React.useState(initial?.body ?? "");
  const [targetRole, setTargetRole] = React.useState<Role | "all">(initial?.targetRole ?? "all");
  const [pinned, setPinned] = React.useState(initial?.pinned ?? false);
  const [emailIt, setEmailIt] = React.useState(false);

  function submit(publish: boolean) {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    onSave(
      {
        id: initial?.id ?? newId(),
        title: title.trim(),
        body: body.trim(),
        targetRole,
        pinned,
        published: publish,
        authorId: initial?.authorId || authorId,
        authorName: initial?.authorName || authorName,
        createdAt: initial?.createdAt ?? now,
        updatedAt: now,
      },
      emailIt && publish,
    );
  }

  return (
    <Card padded className="space-y-3">
      <h2 className="font-heading text-base font-semibold text-heading">
        {initial ? "Edit announcement" : "New announcement"}
      </h2>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="min-h-[120px]"
        placeholder="Write your announcement… (blank lines separate paragraphs)"
      />
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Audience</span>
          <Select value={targetRole} onChange={(e) => setTargetRole(e.target.value as Role | "all")} className="w-48">
            <option value="all">All learners</option>
            <option value="student">Students</option>
            <option value="professional">Professionals</option>
            <option value="entrepreneur">Entrepreneurs</option>
          </Select>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-heading">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="h-4 w-4 rounded border-hair text-gold-500 focus:ring-gold-400"
          />
          Pin to top
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-heading">
          <input
            type="checkbox"
            checked={emailIt}
            onChange={(e) => setEmailIt(e.target.checked)}
            className="h-4 w-4 rounded border-hair text-gold-500 focus:ring-gold-400"
          />
          Also email this to {targetRole === "all" ? "all learners" : `all ${targetRole}s`} on publish
        </label>
      </div>
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          onClick={() => onTest({ title: title.trim(), body: body.trim(), targetRole })}
          disabled={!title.trim() || sendingTest}
        >
          {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send test to me
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="outline" onClick={() => submit(false)} disabled={!title.trim()}>
          Save draft
        </Button>
        <Button onClick={() => submit(true)} disabled={!title.trim()}>
          {initial && initial.published ? "Save & keep live" : "Publish"}
        </Button>
      </div>
    </Card>
  );
}
