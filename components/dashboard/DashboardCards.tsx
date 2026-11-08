"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, Flag, Flame, Megaphone, Quote, Trophy, Video } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { daysUntil, hostInitials } from "@/components/SessionCard";
import { StampGrid } from "@/components/v2/StampGrid";
import { Bar, SegTabs, V2Card, V2_AVATAR, v2Button } from "@/components/v2/ui";
import { useApp } from "@/lib/store/AppProvider";
import { levelStyle, shortLevelLabel } from "@/lib/levels";
import { computeStamps, type Stamp } from "@/lib/stamps";
import { CREDIT_TIERS, tierForCredits, courseCategories } from "@/lib/types";
import type { Announcement, DailyTip, LeaderboardRow, LiveSession, Role } from "@/lib/types";
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
 * Six stamps for the dashboard card: the newest earned ones, then the ones the
 * learner is closest to earning. The full set is on their profile.
 */
function dashboardStamps(stamps: Stamp[]): Stamp[] {
  const earned = stamps.filter((s) => s.earned).sort((a, b) => ((a.earnedAt ?? "") < (b.earnedAt ?? "") ? 1 : -1));
  const next = stamps.filter((s) => !s.earned).sort((a, b) => b.current / b.target - a.current / a.target);
  const pick = [...earned.slice(0, 3), ...next].slice(0, 6);
  // Keep the catalogue's order, so a stamp does not jump around as it is earned.
  return stamps.filter((s) => pick.includes(s));
}
type Period = "month" | "all";
/** Rows on the dashboard board; the learner's own row is added below when they are further down. */
const BOARD_SIZE = 5;

const BOARD_TINTS = [
  "bg-lv-peers-tint text-lv-peers-dark",
  "bg-lv-people-tint text-lv-people-dark",
  "bg-lv-upwards-tint text-lv-upwards-dark",
  "bg-lv-self-tint text-lv-self-dark",
  "bg-lv-cultures-tint text-lv-cultures-dark",
  "bg-lv-orgs-tint text-lv-orgs-dark",
];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

/** Credits, stamps and the leaderboard in one card, behind tabs. All three are real data. */
export function StandingCard({ nextUp, animate }: { nextUp?: { title: string; href: string } | null; animate?: boolean }) {
  const { currentUser, courses, submissions, progress, ideaResponses, stamps: earned, creditEvents, learningStreak, getCourse } = useApp();
  const [tab, setTab] = React.useState<StandingTab>("credits");
  if (!currentUser) return null;

  const credits = currentUser.learningCredits;
  const tier = tierForCredits(credits);
  const tierIndex = CREDIT_TIERS.findIndex((t) => t.label === tier.label);
  const nextTier = CREDIT_TIERS[tierIndex + 1];
  const stamps = computeStamps(currentUser, courses, submissions, progress, ideaResponses, earned);
  const earnedCount = stamps.filter((s) => s.earned).length;
  const streak = learningStreak();
  const recent = creditEvents.filter((e) => e.userId === currentUser.id).slice(0, 3);

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
          { id: "stamps", label: `Stamps ${earnedCount}/${stamps.length}` },
          { id: "leaderboard", label: "Leaderboard" },
        ]}
      />

      {tab === "leaderboard" ? (
        <Leaderboard role={currentUser.role} />
      ) : tab === "credits" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="flex items-baseline gap-2">
              <span className="font-heading text-[44px] font-bold leading-[48px] tracking-[-0.015em] text-heading tabular-nums">{credits}</span>
              <span className="text-[15px] text-muted">credits</span>
            </p>
            {streak.current > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-lv-people-tint px-2.5 py-1 text-xs font-semibold text-lv-people-dark" title={`Best: ${streak.best} days`}>
                <Flame className="h-3.5 w-3.5" /> {streak.current}-day streak
              </span>
            )}
          </div>
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
          {recent.length > 0 ? (
            <ul className="space-y-1.5">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center gap-2.5 text-[13px]">
                  <span className="grid h-6 min-w-[44px] place-items-center rounded-full bg-lv-orgs-tint px-2 font-bold tabular-nums text-lv-orgs-dark">+{e.amount}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-heading">{(e.courseId && getCourse(e.courseId)?.title.split(":")[0]) || "A topic"}</span>
                  <span className="shrink-0 text-xs font-medium text-muted">{timeAgo(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] leading-5 text-muted">Credits grow as you finish videos and checkpoints: up to 100 for each topic, more for answers you get right first time.</p>
          )}
          {nextUp && (
            <Link href={nextUp.href} className="group flex items-center gap-3 rounded-2xl bg-surface p-3 transition-colors duration-200 hover:bg-surface-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lv-self text-white">
                <Flag className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-heading">Keep going in {nextUp.title}</span>
                <span className="block text-xs font-medium text-muted">Each video and checkpoint adds to its 100 credits</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-heading transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-v2-body">
              {earnedCount} of {stamps.length} stamps earned
            </p>
            <Link href={`/u/${currentUser.username ?? currentUser.id}`} className="text-xs font-semibold text-v2-gold-text hover:underline">
              See all {stamps.length}
            </Link>
          </div>
          <StampGrid stamps={dashboardStamps(stamps)} />
        </div>
      )}
    </V2Card>
  );
}

/** Learners ranked by credits, this month or all time, in the learner's path or everyone. */
function Leaderboard({ role }: { role: Role | null }) {
  const { getLeaderboard, stamps } = useApp();
  const [period, setPeriod] = React.useState<Period>("month");
  const [scope, setScope] = React.useState<"path" | "everyone">("path");
  const [rows, setRows] = React.useState<LeaderboardRow[] | null | undefined>(undefined);
  const filterRole = scope === "path" ? role : null;

  React.useEffect(() => {
    let active = true;
    setRows(undefined);
    getLeaderboard(period, filterRole, BOARD_SIZE).then(
      (r) => active && setRows(r),
      () => active && setRows(null),
    );
    return () => {
      active = false;
    };
    // stamps: a new stamp means the learner just earned credits; refresh the ranks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, filterRole, stamps.length]);

  const list = rows ?? [];
  const meRow = list.find((r) => r.isMe);
  // The learner's own row comes last when they are outside the top rows.
  const meDetached = !!meRow && list.length > BOARD_SIZE && list[list.length - 1] === meRow;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegTabs
          value={period}
          onChange={setPeriod}
          className="p-0.5 [&>button]:px-3 [&>button]:py-1 [&>button]:text-xs"
          tabs={[
            { id: "month", label: "This month" },
            { id: "all", label: "All time" },
          ]}
        />
        {role && (
          <SegTabs
            value={scope}
            onChange={setScope}
            className="p-0.5 [&>button]:px-3 [&>button]:py-1 [&>button]:text-xs"
            tabs={[
              { id: "path", label: "My path" },
              { id: "everyone", label: "Everyone" },
            ]}
          />
        )}
      </div>

      {rows === undefined ? (
        <ol aria-busy className="space-y-1.5">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-8 animate-pulse rounded-xl bg-surface" />
          ))}
        </ol>
      ) : rows === null ? (
        <p className="py-4 text-center text-sm text-muted">The leaderboard could not be loaded right now.</p>
      ) : list.every((r) => r.credits === 0) ? (
        <div className="rounded-2xl bg-surface p-4 text-center">
          <p className="text-sm font-semibold text-heading">{period === "month" ? "Nobody has earned credits this month yet" : "No credits earned yet"}</p>
          <p className="mt-1 text-xs text-muted">Finish a video or a checkpoint and you are on the board.</p>
        </div>
      ) : (
        <ol className="space-y-1">
          {list.map((r, i) => (
            <React.Fragment key={r.userId}>
              {meDetached && r.isMe && <li aria-hidden className="px-2.5 text-center text-xs leading-3 text-faint">···</li>}
              <li>
                <Link
                  href={`/u/${r.username ?? r.userId}`}
                  className={cn("flex items-center gap-2.5 rounded-xl px-2.5 py-1 transition-colors duration-200", r.isMe ? "bg-v2-gold-soft" : "hover:bg-surface")}
                >
                  <span className={cn("w-5 shrink-0 text-[13px] font-semibold tabular-nums", r.rank <= 3 && r.credits > 0 ? "text-v2-gold-text" : "text-muted")}>{r.rank}</span>
                  {r.avatarUrl ? (
                    <Avatar src={r.avatarUrl} name={r.name} size={28} ring={false} className={V2_AVATAR} />
                  ) : (
                    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10.5px] font-bold", r.isMe ? "bg-v2-strong text-v2-on-strong" : BOARD_TINTS[i % BOARD_TINTS.length])}>
                      {initials(r.name)}
                    </span>
                  )}
                  <span className={cn("min-w-0 flex-1 truncate text-sm text-heading", r.isMe ? "font-semibold" : "font-medium")}>
                    {r.name}
                    {r.isMe && " (you)"}
                  </span>
                  <span className="shrink-0 text-[13px] font-bold tabular-nums text-heading">{r.credits}</span>
                </Link>
              </li>
            </React.Fragment>
          ))}
        </ol>
      )}
    </div>
  );
}
