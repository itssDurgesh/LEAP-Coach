"use client";

import Link from "next/link";
import { AtSign, MessageSquare, Megaphone, Video, Bell, CheckCheck, Pin } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { useApp } from "@/lib/store/AppProvider";
import { cn, timeAgo } from "@/lib/utils";

export default function NotificationsPage() {
  return (
    <AppShell>
      <Notifications />
    </AppShell>
  );
}

/** Small uppercase rule used to separate the three notification groups. */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-heading text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
      {children}
    </h2>
  );
}

function Notifications() {
  const {
    currentUser,
    notifications,
    announcements,
    sessions,
    getVideoById,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();

  if (!currentUser) return null;
  const role = currentUser.role;

  // Deep-link a discussion notification back to the video player it came from.
  const linkFor = (videoId?: string | null) => {
    if (videoId) {
      const found = getVideoById(videoId);
      if (found) return `/learn/${found.course.id}/${found.video.order}`;
    }
    return "/dashboard";
  };

  const mine = notifications
    .filter((n) => n.userId === currentUser.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const unread = mine.filter((n) => !n.read).length;

  const myAnnouncements = announcements
    .filter((a) => a.published && (a.targetRole === "all" || a.targetRole === role))
    .sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : a.createdAt < b.createdAt ? 1 : -1));

  const upcomingSessions = sessions
    .filter((s) => (s.targetRole === "all" || s.targetRole === role) && Date.parse(s.startsAt) >= Date.now())
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));

  const empty = mine.length === 0 && myAnnouncements.length === 0 && upcomingSessions.length === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="All your mentions, replies, announcements and live sessions in one place."
        actions={
          unread > 0 ? (
            <button
              onClick={() => markAllNotificationsRead()}
              className="inline-flex items-center gap-1.5 rounded-full border border-hair px-3.5 py-2 font-heading text-sm font-semibold text-gold-700 transition-all duration-200 hover:border-gold-500 hover:bg-gold-500 hover:text-navy-900"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          ) : undefined
        }
      />

      {empty && (
        <Panel className="py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-faint">
            <Bell className="h-6 w-6" />
          </span>
          <p className="mt-4 font-heading text-lg font-bold text-heading">You&rsquo;re all caught up</p>
          <p className="mt-1.5 text-sm text-muted">
            New mentions, replies and announcements will show up here.
          </p>
        </Panel>
      )}

      {/* ── Mentions & replies ── */}
      {mine.length > 0 && (
        <section>
          <GroupLabel>
            Mentions &amp; replies
            {unread > 0 && (
              <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold tabular-nums text-navy-900">
                {unread} new
              </span>
            )}
          </GroupLabel>
          <Panel padded={false} className="divide-y divide-hair overflow-hidden">
            {mine.map((n) => (
              <Link
                key={n.id}
                href={linkFor(n.videoId)}
                onClick={() => markNotificationRead(n.id)}
                className={cn(
                  "flex gap-3.5 px-5 py-4 transition-colors duration-200 hover:bg-surface-2",
                  !n.read && "bg-gold-50 dark:bg-gold-500/10",
                )}
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-gold-600">
                  {n.type === "mention" ? <AtSign className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-heading">
                    <span className="font-semibold">{n.actorName}</span>{" "}
                    {n.type === "mention" ? "mentioned you in a discussion" : "replied to your comment"}
                  </p>
                  {n.preview && <p className="mt-1 line-clamp-2 text-sm text-muted">{n.preview}</p>}
                  <p className="mt-1.5 text-xs text-faint">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />}
              </Link>
            ))}
          </Panel>
        </section>
      )}

      {/* ── Upcoming live sessions ── */}
      {upcomingSessions.length > 0 && (
        <section>
          <GroupLabel>Upcoming live sessions</GroupLabel>
          <Panel padded={false} className="divide-y divide-hair overflow-hidden">
            {upcomingSessions.map((s) => (
              <Link
                key={s.id}
                href="/sessions"
                className="flex gap-3.5 px-5 py-4 transition-colors duration-200 hover:bg-surface-2"
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-gold-600">
                  <Video className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-heading">{s.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {s.instructorName} ·{" "}
                    {new Date(s.startsAt).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    {", "}
                    {new Date(s.startsAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </Link>
            ))}
          </Panel>
        </section>
      )}

      {/* ── Announcements ── */}
      {myAnnouncements.length > 0 && (
        <section>
          <GroupLabel>Announcements</GroupLabel>
          <Panel padded={false} className="divide-y divide-hair overflow-hidden">
            {myAnnouncements.map((a) => (
              <Link
                key={a.id}
                href="/announcements"
                className="flex gap-3.5 px-5 py-4 transition-colors duration-200 hover:bg-surface-2"
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-gold-600">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-heading">
                    {a.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-gold-600" />}
                    {a.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{a.body}</p>
                  <p className="mt-1.5 text-xs text-faint">{timeAgo(a.createdAt)}</p>
                </div>
              </Link>
            ))}
          </Panel>
        </section>
      )}
    </div>
  );
}
