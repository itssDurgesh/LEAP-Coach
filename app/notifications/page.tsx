"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Check, Megaphone } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { hostInitials } from "@/components/SessionCard";
import { PageHead, SegTabs, V2Card, v2Button } from "@/components/v2/ui";
import { useApp } from "@/lib/store/AppProvider";
import { cn, timeAgo } from "@/lib/utils";

export default function NotificationsPage() {
  return (
    <AppShell>
      <Notifications />
    </AppShell>
  );
}

type Tab = "all" | "mentions" | "sessions" | "announcements";

const HEADING = "font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading";
const ROW = "flex gap-3.5 rounded-2xl p-3.5 transition-colors duration-200";

// A person's initials sit on one of the level tints, picked from their name so it stays the same.
const TINTS = [
  "bg-lv-peers-tint text-lv-peers-dark",
  "bg-lv-people-tint text-lv-people-dark",
  "bg-lv-upwards-tint text-lv-upwards-dark",
  "bg-lv-self-tint text-lv-self-dark",
  "bg-lv-cultures-tint text-lv-cultures-dark",
  "bg-lv-orgs-tint text-lv-orgs-dark",
];
const tintFor = (name: string) => TINTS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TINTS.length];

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
  const [tab, setTab] = React.useState<Tab>("all");

  if (!currentUser) return null;
  const role = currentUser.role;

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
  const withCount = (label: string, n: number) => (n > 0 ? `${label} ${n}` : label);

  const mentionsCard = (
    <V2Card className="p-5">
      <div className="flex items-center gap-2.5 px-1 pb-2.5">
        <h2 className={HEADING}>Mentions and replies</h2>
        {unread > 0 && (
          <span className="rounded-full bg-[#E9B93E] px-3 py-1.5 text-xs font-semibold leading-[18px] text-navy-800">{unread} new</span>
        )}
      </div>
      {mine.length === 0 && <p className="px-1 py-6 text-sm font-medium text-muted">No mentions or replies yet.</p>}
      <div className="space-y-1">
        {mine.map((n) => {
          // Deep-link a discussion notification back to the video player it came from.
          const found = n.videoId ? getVideoById(n.videoId) : null;
          return (
            <Link
              key={n.id}
              href={
                found
                  ? `/learn/${found.course.id}/${found.video.order}?tab=discussion${n.commentId ? `&c=${n.commentId}` : ""}`
                  : "/dashboard"
              }
              onClick={() => markNotificationRead(n.id)}
              className={cn(ROW, n.read ? "hover:bg-surface" : "bg-v2-gold-soft")}
            >
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold", tintFor(n.actorName))}>
                {hostInitials(n.actorName)}
              </span>
              <div className="min-w-0 flex-1 space-y-[3px]">
                <p className="text-sm font-semibold leading-5 text-heading">
                  {n.actorName} {n.type === "mention" ? "mentioned you in a discussion" : "replied to your comment"}
                </p>
                {n.preview && <p className="line-clamp-2 text-sm leading-5 text-v2-body">“{n.preview}”</p>}
                <p className="text-xs font-medium text-muted">
                  {found && <>{found.video.title} &nbsp;·&nbsp; </>}
                  {timeAgo(n.createdAt)}
                </p>
              </div>
              {!n.read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gold-400" />}
            </Link>
          );
        })}
      </div>
    </V2Card>
  );

  const sessionsCard = upcomingSessions.length > 0 && (
    <V2Card className="p-5">
      <h2 className={cn(HEADING, "px-1 pb-2.5")}>Upcoming live sessions</h2>
      <div className="space-y-1">
        {upcomingSessions.map((s) => {
          const date = new Date(s.startsAt);
          return (
            <Link key={s.id} href="/sessions" className={cn(ROW, "items-center p-2.5 hover:bg-surface")}>
              <span className="w-11 shrink-0 rounded-xl bg-v2-gold-soft py-1.5 text-center">
                <span className="block text-[10.5px] font-bold uppercase leading-[14px] tracking-[0.06em] text-v2-gold-text">
                  {date.toLocaleString("en-IN", { month: "short" })}
                </span>
                <span className="block font-heading text-lg font-bold leading-[22px] text-heading">{date.getDate()}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5 text-heading">{s.title}</span>
                <span className="block text-xs font-medium text-muted">
                  {s.instructorName} &nbsp;·&nbsp; {date.toLocaleDateString("en-IN", { weekday: "short" })},{" "}
                  {date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </V2Card>
  );

  const announcementsCard = myAnnouncements.length > 0 && (
    <V2Card className="p-5">
      <h2 className={cn(HEADING, "px-1 pb-2.5")}>Announcements</h2>
      <div className="space-y-1">
        {myAnnouncements.map((a) => (
          <Link key={a.id} href="/announcements" className={cn(ROW, "items-center p-2.5 hover:bg-surface")}>
            <span
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                a.pinned ? "bg-v2-gold-soft text-v2-gold-text" : "bg-surface text-heading",
              )}
            >
              <Megaphone className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-5 text-heading">{a.title}</span>
              <span className="block text-xs font-medium text-muted">
                {a.pinned && <>Pinned &nbsp;·&nbsp; </>}
                {timeAgo(a.createdAt)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </V2Card>
  );

  return (
    <div className="space-y-7">
      <PageHead
        title="Notifications"
        description="Mentions, replies, announcements and live sessions in one place."
        actions={
          unread > 0 && (
            <button type="button" onClick={() => markAllNotificationsRead()} className={v2Button("outline", "sm")}>
              <Check className="h-3.5 w-3.5" strokeWidth={2.4} /> Mark all read
            </button>
          )
        }
      />

      {empty ? (
        <V2Card className="px-6 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
            <Bell className="h-6 w-6" />
          </span>
          <p className="mt-4 font-heading text-lg font-semibold text-heading">You&rsquo;re all caught up</p>
          <p className="mt-1.5 text-sm text-v2-body">New mentions, replies and announcements will show up here.</p>
        </V2Card>
      ) : (
        <>
          <div className="scrollbar-thin overflow-x-auto">
            <SegTabs
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "all", label: "All" },
                { id: "mentions", label: withCount("Mentions", unread) },
                { id: "sessions", label: withCount("Sessions", upcomingSessions.length) },
                { id: "announcements", label: withCount("Announcements", myAnnouncements.length) },
              ]}
            />
          </div>

          {tab === "all" ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_416px] lg:items-start">
              {mentionsCard}
              <div className="min-w-0 space-y-6">
                {sessionsCard}
                {announcementsCard}
              </div>
            </div>
          ) : (
            <div className="max-w-[856px]">
              {tab === "mentions" && mentionsCard}
              {tab === "sessions" && (sessionsCard || <p className="text-sm font-medium text-muted">No upcoming live sessions.</p>)}
              {tab === "announcements" && (announcementsCard || <p className="text-sm font-medium text-muted">No announcements yet.</p>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
