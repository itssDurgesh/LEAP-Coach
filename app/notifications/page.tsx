"use client";

import Link from "next/link";
import { AtSign, MessageSquare, Megaphone, Video, Bell, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { useApp } from "@/lib/store/AppProvider";
import { cn, timeAgo } from "@/lib/utils";

export default function NotificationsPage() {
  return (
    <AppShell>
      <Notifications />
    </AppShell>
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
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 font-heading text-3xl font-bold text-heading">
            <Bell className="h-7 w-7 text-gold-500" /> Notifications
          </h1>
          <p className="mt-1.5 text-muted">
            Mentions, replies, announcements and live sessions — all in one place.
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAllNotificationsRead()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-hair px-3 py-2 text-sm font-medium text-gold-600 hover:bg-surface-2"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </header>

      {empty && (
        <Card padded className="text-center">
          <Bell className="mx-auto h-9 w-9 text-faint" />
          <p className="mt-3 font-heading text-lg font-semibold text-heading">You&rsquo;re all caught up</p>
          <p className="mt-1 text-sm text-muted">New mentions, replies and announcements will show up here.</p>
        </Card>
      )}

      {/* Mentions & replies */}
      {mine.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
            Mentions &amp; replies
            {unread > 0 && (
              <span className="rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-navy-900">
                {unread} new
              </span>
            )}
          </h2>
          <Card className="divide-y divide-hair overflow-hidden">
            {mine.map((n) => (
              <Link
                key={n.id}
                href={linkFor(n.videoId)}
                onClick={() => markNotificationRead(n.id)}
                className={cn(
                  "flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2",
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
                  {n.preview && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{n.preview}</p>}
                  <p className="mt-1 text-xs text-faint">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />}
              </Link>
            ))}
          </Card>
        </section>
      )}

      {/* Upcoming live sessions */}
      {upcomingSessions.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">Upcoming live sessions</h2>
          <Card className="divide-y divide-hair overflow-hidden">
            {upcomingSessions.map((s) => (
              <Link key={s.id} href="/sessions" className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-gold-600">
                  <Video className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-heading">{s.title}</p>
                  <p className="mt-0.5 text-sm text-muted">
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
          </Card>
        </section>
      )}

      {/* Announcements */}
      {myAnnouncements.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">Announcements</h2>
          <Card className="divide-y divide-hair overflow-hidden">
            {myAnnouncements.map((a) => (
              <Link
                key={a.id}
                href="/announcements"
                className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2"
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-gold-600">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-heading">
                    {a.pinned && <span className="mr-1 text-gold-600">📌</span>}
                    {a.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">{a.body}</p>
                  <p className="mt-1 text-xs text-faint">{timeAgo(a.createdAt)}</p>
                </div>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
