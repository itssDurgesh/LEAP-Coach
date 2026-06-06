"use client";

import { Users, Video, Check, Clock } from "lucide-react";
import { LiveSession } from "@/lib/types";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useApp } from "@/lib/store/AppProvider";
import { cn } from "@/lib/utils";

export function SessionCard({ session }: { session: LiveSession }) {
  const { currentUser, toggleAttendance } = useApp();
  const attending = currentUser ? session.attendeeIds.includes(currentUser.id) : false;
  const date = new Date(session.startsAt);
  const month = date.toLocaleString("en-IN", { month: "short" });
  const day = date.getDate();
  const time = date.toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  const weekday = date.toLocaleString("en-IN", { weekday: "long" });

  return (
    <div className="rounded-2xl border border-hair bg-card p-5 shadow-card">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-navy-900">
          <span className="text-[10px] font-bold uppercase leading-none">{month}</span>
          <span className="font-heading text-xl font-bold leading-none">{day}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-heading text-base font-semibold leading-snug text-heading">
            {session.title}
          </h4>
          <p className="mt-1 text-sm text-muted">
            {session.instructorName}
            {session.courseTitle ? ` · ${session.courseTitle}` : ""}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-faint">
            <Clock className="h-3.5 w-3.5" /> {weekday}, {time} · {session.durationMins} min
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">{session.description}</p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          <Users className="h-4 w-4 text-muted" />
          <span className="font-semibold text-heading">{session.attendeeIds.length}</span> attending
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={attending ? "subtle" : "outline"}
            onClick={() => toggleAttendance(session.id)}
            className={attending ? "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : ""}
          >
            {attending ? (
              <>
                <Check className="h-4 w-4" /> Attending
              </>
            ) : (
              "Vote to attend"
            )}
          </Button>
          <a
            href={session.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "navy", size: "sm" })}
          >
            <Video className="h-4 w-4" /> Join
          </a>
        </div>
      </div>
    </div>
  );
}
