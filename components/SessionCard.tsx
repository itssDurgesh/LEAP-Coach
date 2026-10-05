"use client";

import { Check, Video } from "lucide-react";
import { Bar, V2Card, v2Button } from "@/components/v2/ui";
import { useApp } from "@/lib/store/AppProvider";
import type { LiveSession } from "@/lib/types";

/** "Live now", "Today", "Tomorrow" or "In 6 days", counted in calendar days. */
export function daysUntil(iso: string): string {
  const start = new Date(iso);
  if (+start <= Date.now()) return "Live now";
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((midnight(start) - midnight(new Date())) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/** True until a session's scheduled end, so one that is running still shows. */
export function isUpcoming(s: Pick<LiveSession, "startsAt" | "durationMins">): boolean {
  return Date.parse(s.startsAt) + s.durationMins * 60_000 > Date.now();
}

/** "Prof. Vishal Gupta" → "VG". */
export function hostInitials(name: string | null | undefined): string {
  return (name ?? "")
    .replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.)\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** One live session on the Live sessions page: the join link and the vote to attend. */
export function SessionCard({ session }: { session: LiveSession }) {
  const { currentUser, toggleAttendance } = useApp();
  const attending = currentUser ? session.attendeeIds.includes(currentUser.id) : false;
  const date = new Date(session.startsAt);
  const going = session.attendeeIds.length;

  return (
    <V2Card className="flex flex-col justify-between p-6">
      <div className="space-y-4 pb-5">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
            <Video className="h-4 w-4" /> Live session
          </p>
          <span className="rounded-full bg-v2-gold-soft px-3 py-1.5 text-xs font-semibold leading-[18px] text-v2-gold-text">
            {daysUntil(session.startsAt)}
          </span>
        </div>
        <div className="flex items-start gap-3.5">
          <div className="shrink-0 rounded-2xl bg-v2-gold-soft px-3.5 py-2 text-center">
            <p className="text-[10.5px] font-bold uppercase leading-[14px] tracking-[0.06em] text-v2-gold-text">
              {date.toLocaleString("en-IN", { month: "short" })}
            </p>
            <p className="font-heading text-2xl font-bold leading-7 text-heading">{date.getDate()}</p>
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-xl font-semibold leading-[1.25] tracking-[-0.015em] text-heading">{session.title}</h2>
            <p className="mt-1 text-[13px] font-medium text-muted">
              {date.toLocaleString("en-IN", { weekday: "short" })} &nbsp;·&nbsp;{" "}
              {date.toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })} &nbsp;·&nbsp; {session.durationMins} min
            </p>
          </div>
        </div>
        <p className="text-sm leading-5 text-v2-body">{session.description}</p>
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-v2-strong text-[10.5px] font-bold text-v2-on-strong">
            {hostInitials(session.instructorName)}
          </span>
          <span className="min-w-0 truncate text-[13px] font-medium text-v2-body">
            {session.instructorName}
            {session.courseTitle ? ` · ${session.courseTitle}` : ""}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold leading-[18px] text-heading">{going} attending</span>
            <span className="font-medium text-muted">{session.capacity} seats</span>
          </div>
          <Bar pct={session.capacity ? (going / session.capacity) * 100 : 0} className="mt-1.5 h-1.5" />
        </div>
      </div>
      <div className="flex gap-2.5">
        <a href={session.meetLink} target="_blank" rel="noopener noreferrer" className={v2Button("primary", "md", "flex-1")}>
          Join session
        </a>
        <button type="button" onClick={() => toggleAttendance(session.id)} aria-pressed={attending} className={v2Button("outline")}>
          <Check className="h-4 w-4" strokeWidth={2.4} /> {attending ? "Attending" : "I'll attend"}
        </button>
      </div>
    </V2Card>
  );
}
