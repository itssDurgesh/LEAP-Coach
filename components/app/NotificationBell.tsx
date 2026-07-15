"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, AtSign, MessageSquare } from "lucide-react";
import { useApp } from "@/lib/store/AppProvider";
import { cn, timeAgo } from "@/lib/utils";

export function NotificationBell() {
  const { currentUser, notifications, markNotificationRead, markAllNotificationsRead, getVideoById } = useApp();
  const [open, setOpen] = React.useState(false);

  if (!currentUser) return null;

  // Notifications come from per-video discussions; deep-link to that video's player.
  const linkFor = (videoId?: string | null) => {
    if (videoId) {
      const found = getVideoById(videoId);
      if (found) return `/learn/${found.course.id}/${found.video.order}`;
    }
    return currentUser.isAdmin ? "/admin" : "/dashboard";
  };

  const mine = notifications
    .filter((n) => n.userId === currentUser.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const unread = mine.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-heading hover:bg-surface-2"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-navy-900 ring-2 ring-surface">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-hair bg-card shadow-card-hover">
            <div className="flex items-center justify-between border-b border-hair px-4 py-3">
              <p className="font-heading font-semibold text-heading">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={() => markAllNotificationsRead()}
                  className="text-xs font-medium text-gold-600 hover:text-gold-700"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {mine.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted">No notifications yet.</p>
              )}
              {mine.map((n) => (
                <Link
                  key={n.id}
                  href={linkFor(n.videoId)}
                  onClick={() => {
                    markNotificationRead(n.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2",
                    !n.read && "bg-gold-50 dark:bg-gold-500/10",
                  )}
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-gold-600">
                    {n.type === "mention" ? <AtSign className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-heading">
                      <span className="font-semibold">{n.actorName}</span>{" "}
                      {n.type === "mention" ? "mentioned you in a discussion" : "replied to your comment"}
                    </p>
                    {n.preview && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.preview}</p>}
                    <p className="mt-0.5 text-xs text-faint">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" />}
                </Link>
              ))}
            </div>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-hair px-4 py-3 text-center text-sm font-semibold text-gold-600 transition-colors hover:bg-surface-2"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
