"use client";

import { Megaphone, Pin } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHead, V2Card } from "@/components/v2/ui";
import { useApp } from "@/lib/store/AppProvider";
import type { Announcement } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export default function AnnouncementsPage() {
  return (
    <AppShell>
      <Announcements />
    </AppShell>
  );
}

const CHIP = "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold leading-[18px]";
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** "Students" / "Professionals" tag for an announcement sent to one path only. */
function Audience({ announcement: a }: { announcement: Announcement }) {
  if (a.targetRole === "all") return null;
  return <span className={`${CHIP} bg-lv-self-tint capitalize text-lv-self-dark`}>{a.targetRole}s</span>;
}

function Announcements() {
  const { announcements, currentUser } = useApp();
  if (!currentUser) return null;
  const role = currentUser.role;

  const list = announcements
    .filter((a) => a.published && (a.targetRole === "all" || a.targetRole === role))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const pinned = list.filter((a) => a.pinned);
  const earlier = list.filter((a) => !a.pinned);

  return (
    <div className="space-y-7">
      <PageHead
        title="Announcements"
        description="Updates and news from the LEAP Coach team."
        actions={
          list.length > 0 && (
            <span className={`${CHIP} border border-hair bg-card text-v2-body`}>
              {list.length} {list.length === 1 ? "announcement" : "announcements"}
            </span>
          )
        }
      />

      {list.length === 0 && (
        <V2Card className="px-6 py-16 text-center text-sm font-medium text-v2-body">No announcements yet. Check back soon.</V2Card>
      )}

      {pinned.map((a) => (
        <article key={a.id} className="flex items-start gap-5 rounded-[24px] bg-v2-idea p-7">
          <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[#E9B93E] text-navy-800">
            <Megaphone className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`${CHIP} bg-card text-v2-gold-text`}>
                <Pin className="h-3.5 w-3.5" /> Pinned
              </span>
              <Audience announcement={a} />
              <span className="text-[13px] font-medium text-muted">
                {a.authorName} &nbsp;·&nbsp; {fmtDate(a.createdAt)}
              </span>
            </div>
            <h2 className="font-heading text-2xl font-bold leading-[30px] tracking-[-0.015em] text-heading">{a.title}</h2>
            <p className="whitespace-pre-line text-[15px] leading-6 text-v2-body">{a.body}</p>
          </div>
        </article>
      ))}

      {earlier.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {earlier.map((a) => (
            <V2Card key={a.id} className="space-y-3 p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-heading">
                  <Megaphone className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-medium text-muted">
                  {a.authorName} &nbsp;·&nbsp; {timeAgo(a.createdAt)}
                </span>
                <Audience announcement={a} />
              </div>
              <h2 className="font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">{a.title}</h2>
              <p className="whitespace-pre-line text-sm leading-5 text-v2-body">{a.body}</p>
            </V2Card>
          ))}
        </div>
      )}
    </div>
  );
}
