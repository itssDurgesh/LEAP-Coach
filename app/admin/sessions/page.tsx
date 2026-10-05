"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Users, Video, Bell, Calendar, Check, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select, Field } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { LiveSession } from "@/lib/types";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const blank = (): LiveSession => ({
  id: `sess_${Date.now()}`,
  title: "",
  courseTitle: "",
  instructorName: "",
  startsAt: new Date(Date.now() + 86400000).toISOString(),
  durationMins: 60,
  meetLink: "https://meet.google.com/",
  description: "",
  targetRole: "all",
  attendeeIds: [],
  capacity: 100,
});

export default function AdminSessionsPage() {
  return (
    <AdminShell title="Live Sessions" subtitle="Schedule sessions, share Meet links, and track attendance" requires="sessions">
      <SessionsAdmin />
    </AdminShell>
  );
}

function SessionsAdmin() {
  const { sessions, users, saveSession, deleteSession, markSessionNotified } = useApp();
  const [editing, setEditing] = React.useState<LiveSession | null>(null);
  const [toast, setToast] = React.useState<{ ok: boolean; msg: string } | null>(null);
  const [sendingId, setSendingId] = React.useState<string | null>(null);

  const sorted = [...sessions].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 7000);
  };

  // Approx audience size (learners in this role, not banned/admin) for the N/M display.
  const audienceSize = (targetRole: LiveSession["targetRole"]) =>
    users.filter((u) => !u.isAdmin && !u.banned && (targetRole === "all" || u.role === targetRole)).length;

  // Notify a session's audience by id. By default the server emails only those not yet
  // reached (retry-safe); resendAll re-invites everyone. It records who was delivered.
  async function emailInvites(s: LiveSession, resendAll = false) {
    setSendingId(s.id);
    try {
      const res = await fetch("/api/admin/email/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "session", id: s.id, resendAll }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send invites.");
      markSessionNotified(s.id, data.notifiedAt ?? null, data.notifiedUserIds ?? []);
      if (data.nothingToSend) {
        showToast(true, `Everyone in the audience (${data.totalEligible}) has already been invited.`);
      } else {
        const reason = data.failedNow && data.errors?.length ? ` — e.g. ${data.errors[0]}` : "";
        const remain = data.remaining ? ` · ${data.remaining} still not reached` : "";
        const failed = data.failedNow ? ` · ${data.failedNow} failed${reason}` : "";
        showToast(true, `Invited ${data.deliveredNow} of ${data.totalEligible}${failed}${remain}.`);
      }
    } catch (e) {
      showToast(false, e instanceof Error ? e.message : "Could not send invites.");
    } finally {
      setSendingId(null);
    }
  }

  function onBellClick(s: LiveSession) {
    const audience = s.targetRole === "all" ? "all learners" : `all ${s.targetRole}s`;
    const done = s.notifiedUserIds?.length ?? 0;
    const total = audienceSize(s.targetRole);
    if (done === 0) {
      if (confirm(`Email an invite for "${s.title}" to ${audience} (${total})?`)) void emailInvites(s, false);
    } else if (done < total) {
      if (confirm(`Retry: invite the ${total - done} learner${total - done === 1 ? "" : "s"} who haven't received "${s.title}" yet?`))
        void emailInvites(s, false);
    } else if (confirm(`Everyone (${total}) has already been invited to "${s.title}". Re-send to all again?`)) {
      void emailInvites(s, true);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setEditing(blank())}>
          <Plus className="h-4 w-4" /> Schedule session
        </Button>
      </div>

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

      <div className="grid gap-4 lg:grid-cols-2">
        {sorted.map((s) => {
          const d = new Date(s.startsAt);
          const done = s.notifiedUserIds?.length ?? 0;
          const total = audienceSize(s.targetRole);
          const allDone = done > 0 && done >= total;
          return (
            <Card key={s.id} padded>
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[14px] bg-v2-navy text-white">
                  <span className="text-[10px] font-bold uppercase">{d.toLocaleString("en-IN", { month: "short" })}</span>
                  <span className="font-heading text-xl font-bold leading-none">{d.getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-semibold text-heading">{s.title}</h3>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {done > 0 && (
                        <Badge variant={allDone ? "success" : "gold"}>
                          <Check className="h-3 w-3" /> {done}/{total} invited
                        </Badge>
                      )}
                      <Badge variant="navy" className="capitalize">{s.targetRole}</Badge>
                    </div>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {s.instructorName}
                    {s.courseTitle ? ` · ${s.courseTitle}` : ""}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-faint">
                    <Calendar className="h-3.5 w-3.5" />
                    {d.toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit", hour12: true })} · {s.durationMins} min
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-hair pt-3">
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <Users className="h-4 w-4 text-muted" />
                  <span className="font-semibold text-heading">{s.attendeeIds.length}</span>/{s.capacity} voted
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onBellClick(s)}
                    disabled={sendingId === s.id}
                    title={done === 0 ? "Email invite to audience" : allDone ? "All invited — re-send to everyone" : `Retry — ${total - done} not yet reached`}
                    className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-gold-600 disabled:opacity-50"
                  >
                    {sendingId === s.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : done === 0 ? (
                      <Bell className="h-4 w-4" />
                    ) : allDone ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-gold-600" />
                    )}
                  </button>
                  <a href={s.meetLink} target="_blank" rel="noopener noreferrer" title="Open Meet" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading">
                    <Video className="h-4 w-4" />
                  </a>
                  <button onClick={() => setEditing(s)} title="Edit" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-heading">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${s.title}"?`)) deleteSession(s.id);
                    }}
                    title="Delete"
                    className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing && sessions.some((s) => s.id === editing.id) ? "Edit session" : "Schedule session"}>
        {editing && (
          <SessionForm
            session={editing}
            onSave={(s) => {
              saveSession(s);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function SessionForm({
  session,
  onSave,
  onCancel,
}: {
  session: LiveSession;
  onSave: (s: LiveSession) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState<LiveSession>(session);
  const set = (patch: Partial<LiveSession>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-4 p-6"
    >
      <Field label="Title" required>
        <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Live AMA: …" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Instructor">
          <Input value={form.instructorName} onChange={(e) => set({ instructorName: e.target.value })} placeholder="Prof. Vishal Gupta" />
        </Field>
        <Field label="Course (optional)">
          <Input value={form.courseTitle} onChange={(e) => set({ courseTitle: e.target.value })} placeholder="The Authentic Leader" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date & time">
          <Input
            type="datetime-local"
            value={toLocalInput(form.startsAt)}
            onChange={(e) => set({ startsAt: new Date(e.target.value).toISOString() })}
          />
        </Field>
        <Field label="Duration (mins)">
          <Input type="number" min={15} value={form.durationMins} onChange={(e) => set({ durationMins: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Google Meet link" required>
        <Input value={form.meetLink} onChange={(e) => set({ meetLink: e.target.value })} placeholder="https://meet.google.com/abc-defg-hij" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target audience">
          <Select value={form.targetRole} onChange={(e) => set({ targetRole: e.target.value as LiveSession["targetRole"] })}>
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="professional">Professionals</option>
            <option value="entrepreneur">Entrepreneurs</option>
          </Select>
        </Field>
        <Field label="Capacity">
          <Input type="number" min={1} value={form.capacity} onChange={(e) => set({ capacity: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Description">
        <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} className="min-h-[72px]" />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save session</Button>
      </div>
    </form>
  );
}
