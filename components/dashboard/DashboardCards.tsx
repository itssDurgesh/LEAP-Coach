"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, Flag, Megaphone, Quote, Trophy, Video } from "lucide-react";
import { daysUntil, hostInitials } from "@/components/SessionCard";
import { StampGrid } from "@/components/v2/StampGrid";
import { Bar, SegTabs, V2Card, v2Button } from "@/components/v2/ui";
import { useApp } from "@/lib/store/AppProvider";
import { levelStyle, shortLevelLabel } from "@/lib/levels";
import { computeStamps } from "@/lib/stamps";
import { CREDIT_TIERS, tierForCredits, courseCategories } from "@/lib/types";
import type { Announcement, DailyTip, LiveSession } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

/** One slim line for the latest announcement. */
export function AnnouncementBanner({ announcement }: { announcement: Announcement }) {
  return (
    <Link
      href="/announcements"
      className="group flex items-center gap-3 rounded-full bg-card py-2 pl-2 pr-4 shadow-v2-soft transition-shadow duration-200 hover:shadow-v2-card"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-v2-gold-soft text-gold-600">
        <Megaphone className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-heading sm:max-w-[50%] sm:flex-none">{announcement.title}</span>
      <span className="hidden min-w-0 flex-1 truncate text-sm text-muted sm:block">{announcement.body}</span>
      <span className="hidden shrink-0 text-xs font-medium text-muted sm:block">{timeAgo(announcement.createdAt)}</span>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-heading">
        Read <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function NextSessionCard({ session }: { session: LiveSession | undefined }) {
  const { currentUser, toggleAttendance } = useApp();
  if (!session) {
    return (
      <V2Card className="flex h-full flex-col justify-center p-6">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          <Video className="h-4 w-4" /> Next live session
        </p>
        <p className="mt-3 text-sm text-v2-body">No live sessions are scheduled right now.</p>
        <Link href="/sessions" className={v2Button("outline", "sm", "mt-4 self-start")}>
          All sessions <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </V2Card>
    );
  }
  const attending = currentUser ? session.attendeeIds.includes(currentUser.id) : false;
  const date = new Date(session.startsAt);

  return (
    <V2Card className="flex h-full flex-col justify-between p-6">
      <div className="space-y-4 pb-[18px]">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
            <Video className="h-4 w-4" /> Next live session
          </p>
          <span className="rounded-full bg-v2-gold-soft px-2.5 py-1 text-xs font-semibold text-v2-gold-text">
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
            <h3 className="font-heading text-xl font-semibold leading-[1.25] tracking-[-0.015em] text-heading">{session.title}</h3>
            <p className="mt-1 text-[13px] font-medium text-muted">
              {date.toLocaleString("en-IN", { weekday: "short" })} &nbsp;·&nbsp;{" "}
              {date.toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })} &nbsp;·&nbsp; {session.durationMins} min
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-v2-strong text-[10.5px] font-bold text-v2-on-strong">
            {hostInitials(session.instructorName)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-v2-body">{session.instructorName}</span>
          <span className="shrink-0 text-[13px] font-semibold text-heading">
            {session.attendeeIds.length} of {session.capacity} seats taken
          </span>
        </div>
      </div>
      <div className="flex gap-2.5">
        <a href={session.meetLink} target="_blank" rel="noopener noreferrer" className={v2Button("strong", "md", "flex-1")}>
          Join session
        </a>
        <button type="button" onClick={() => toggleAttendance(session.id)} aria-pressed={attending} className={v2Button("outline")}>
          <Check className="h-4 w-4" strokeWidth={2.4} /> {attending ? "Attending" : "I'll attend"}
        </button>
      </div>
    </V2Card>
  );
}

/** Slim card for the day's wisdom quote. */
export function WisdomCard({ tip }: { tip: DailyTip }) {
  return (
    <div className="flex h-full items-center gap-3 rounded-[20px] bg-card p-4 shadow-v2-soft">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-v2-gold-soft text-gold-600">
        <Quote className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted">Wisdom of the day</p>
        <p className="mt-0.5 text-sm font-medium leading-5 text-heading">
          &ldquo;{tip.text}&rdquo;
          {tip.author ? <span className="text-muted"> — {tip.author}</span> : null}
        </p>
      </div>
    </div>
  );
}

/** The six leadership levels with the learner's progress in each. */
export function LeadershipMap() {
  const { currentUser, courses, tracks, isEnrolled, courseProgress } = useApp();
  if (!currentUser?.role) return null;
  const role = currentUser.role;
  const visible = courses.filter((c) => c.published && courseCategories(c).includes(role));

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold leading-[30px] tracking-[-0.015em] text-heading">Your leadership map</h2>
        <p className="text-sm text-muted">Six levels of leading. Pick one to see its topics.</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 pt-1.5 md:grid-cols-3 xl:grid-cols-6">
        {tracks.map((t) => {
          const s = levelStyle(t.id);
          const inLevel = visible.filter((c) => c.tracks.includes(t.id));
          const total = inLevel.length;
          const started = inLevel.filter((c) => isEnrolled(c.id) && courseProgress(c.id).completed > 0).length;
          const done = inLevel.filter((c) => isEnrolled(c.id) && courseProgress(c.id).pct >= 100).length;
          const complete = total > 0 && done === total;
          const status = total === 0 ? "No topics yet" : complete ? "Completed" : started === 0 ? "Not started" : `${done} of ${total} topics`;
          return (
            <Link
              key={t.id}
              href={`/courses?track=${encodeURIComponent(t.id)}`}
              className={cn("group rounded-[20px] p-5 transition-all duration-200 ease-out-expo hover:-translate-y-1.5 hover:shadow-v2-lift", s.tint)}
            >
              <div className="flex items-center justify-between">
                <span className={cn("grid h-11 w-11 place-items-center rounded-full", s.base, s.on)}>
                  <s.icon className="h-[22px] w-[22px]" />
                </span>
                {/* The "done" tick swaps for an arrow on hover, as in the design. */}
                <span className="relative grid h-7 w-7 place-items-center">
                  {complete && (
                    <span className={cn("grid h-[22px] w-[22px] place-items-center rounded-full transition-opacity duration-200 group-hover:opacity-0", s.base, s.on)}>
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                  <span className={cn("absolute inset-0 grid place-items-center rounded-full bg-v2-raised opacity-0 transition-opacity duration-200 group-hover:opacity-100", s.text)}>
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </span>
                </span>
              </div>
              <p className={cn("mt-3.5 text-xs font-medium leading-4", s.text)}>Leading</p>
              <p className="font-heading text-[19px] font-bold leading-[25px] tracking-[-0.015em] text-heading">{shortLevelLabel(t.label)}</p>
              <Bar pct={total ? (done / total) * 100 : 0} className="mt-3.5 h-1.5" trackClass="bg-v2-raised" fillClass={s.base} />
              <p className="mt-3.5 text-[13px] font-medium text-v2-body">{status}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

type StandingTab = "credits" | "stamps" | "leaderboard";

/**
 * PLACEHOLDER CONTENT. The leaderboard is not built yet: nothing ranks learners
 * against each other on the server. These four invented entries stand in for
 * other learners so the tab matches the design; only the signed-in learner's row
 * is real. Replace with real data when the feature is built, and remove the
 * "Sample" tag.
 */
const SAMPLE_BOARD = [
  { name: "Ananya Rao", initials: "AR", credits: 910, tint: "bg-lv-peers-tint", text: "text-lv-peers-dark" },
  { name: "Kabir Mehta", initials: "KM", credits: 780, tint: "bg-lv-people-tint", text: "text-lv-people-dark" },
  { name: "Meera Iyer", initials: "MI", credits: 615, tint: "bg-lv-upwards-tint", text: "text-lv-upwards-dark" },
  { name: "Aarav Shah", initials: "AS", credits: 560, tint: "bg-lv-self-tint", text: "text-lv-self-dark" },
];

/** Credits, stamps and the leaderboard in one card, behind tabs. */
export function StandingCard({ nextUp, animate }: { nextUp?: { title: string; href: string } | null; animate?: boolean }) {
  const { currentUser, courses, submissions, progress } = useApp();
  const [tab, setTab] = React.useState<StandingTab>("credits");
  if (!currentUser) return null;

  const credits = currentUser.learningCredits;
  const tier = tierForCredits(credits);
  const tierIndex = CREDIT_TIERS.findIndex((t) => t.label === tier.label);
  const nextTier = CREDIT_TIERS[tierIndex + 1];
  const stamps = computeStamps(currentUser, courses, submissions, progress);

  return (
    <V2Card className="flex h-full flex-col gap-[18px] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold leading-[25px] tracking-[-0.015em] text-heading">Your standing</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-v2-gold-soft px-2.5 py-1 text-xs font-semibold text-v2-gold-text">
          <Trophy className="h-3.5 w-3.5" strokeWidth={2.2} /> {tier.label} tier
        </span>
      </div>
      <SegTabs
        fill
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "credits", label: "Credits" },
          { id: "stamps", label: "Stamps" },
          { id: "leaderboard", label: "Leaderboard" },
        ]}
      />

      {tab === "leaderboard" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium capitalize text-muted">This month · {currentUser.role} track</p>
            <span className="rounded-full border border-v2-line-strong px-2.5 py-0.5 text-xs font-semibold text-muted">Sample</span>
          </div>
          <ol className="space-y-1">
            {[
              ...SAMPLE_BOARD.map((r) => ({ ...r, me: false })),
              {
                name: currentUser.name,
                initials: currentUser.name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase(),
                credits,
                tint: "bg-v2-strong",
                text: "text-v2-on-strong",
                me: true,
              },
            ]
              .sort((a, b) => b.credits - a.credits)
              .map((r, i) => (
                <li key={r.name} className={cn("flex items-center gap-2.5 rounded-xl px-2.5 py-1", r.me && "bg-v2-gold-soft")}>
                  <span className="w-3.5 shrink-0 text-[13px] font-semibold text-muted">{i + 1}</span>
                  <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10.5px] font-bold", r.tint, r.text)}>{r.initials}</span>
                  <span className={cn("min-w-0 flex-1 truncate text-sm text-heading", r.me ? "font-semibold" : "font-medium")}>
                    {r.name}
                    {r.me && " (you)"}
                  </span>
                  <span className="shrink-0 text-[13px] font-bold text-heading">{r.credits}</span>
                </li>
              ))}
          </ol>
        </div>
      ) : tab === "credits" ? (
        <div className="space-y-4">
          <p className="flex items-baseline gap-2">
            <span className="font-heading text-[44px] font-bold leading-[48px] tracking-[-0.015em] text-heading">{credits}</span>
            <span className="text-[15px] text-muted">credits</span>
          </p>
          <div className="flex gap-1.5">
            {CREDIT_TIERS.map((t, i) => {
              const upper = CREDIT_TIERS[i + 1]?.min;
              const pct = upper === undefined ? (credits >= t.min ? 100 : 0) : ((credits - t.min) / (upper - t.min)) * 100;
              return (
                <div key={t.label} className="flex-1">
                  <Bar pct={pct} animate={animate} />
                  <p className={cn("mt-1.5 text-xs", i === tierIndex ? "font-semibold text-heading" : "font-medium text-muted")}>{t.label}</p>
                </div>
              );
            })}
          </div>
          <p className="text-sm font-medium text-v2-body">
            {nextTier ? `${nextTier.min - credits} credits to reach ${nextTier.label}` : "You have reached the top tier."}
          </p>
          {nextUp && (
            <Link href={nextUp.href} className="group flex items-center gap-3 rounded-2xl bg-surface p-3 transition-colors duration-200 hover:bg-surface-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lv-self text-white">
                <Flag className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-heading">Finish {nextUp.title}</span>
                <span className="block text-xs font-medium text-muted">Earns up to 100 credits</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-heading transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] font-semibold text-v2-body">
            {stamps.filter((s) => s.earned).length} of {stamps.length} stamps earned
          </p>
          <StampGrid stamps={stamps} />
        </div>
      )}
    </V2Card>
  );
}
