"use client";

import * as React from "react";
import { CalendarDays, Check, Info, Lightbulb, Users } from "lucide-react";
import { LevelChip } from "@/components/v2/ui";
import { formatDay } from "@/lib/ideas";
import { useApp } from "@/lib/store/AppProvider";
import type { DailyIdea, LeadershipTrack } from "@/lib/types";
import { useLocalDay } from "@/lib/useLocalDay";
import { cn } from "@/lib/utils";

// The idea for a day does not change once it is chosen, so moving between pages
// does not ask the database again. Keyed by path + day; kept for ten minutes so
// an idea an admin edits shows up without a full reload.
const cache = new Map<string, { idea: DailyIdea | null; at: number }>();
const CACHE_MS = 10 * 60_000;

/**
 * The idea of the day: a short leadership idea with one question. Admins plan
 * them in Admin → Idea of the Day; which one shows is worked out for the
 * learner's own calendar day (lib/ideas.ts), so it changes at their midnight.
 * The learner's first answer is saved; after answering they see how everyone
 * else answered, and can open the other answers' feedback too.
 */
export function IdeaOfTheDay({ tracks }: { tracks: LeadershipTrack[] }) {
  const { currentUser, getIdeaOfTheDay, ideaResponseFor, answerIdea, ideaStats } = useApp();
  const day = useLocalDay();
  const role = currentUser?.role ?? null;
  const cacheKey = `${role ?? "all"}|${day}`;
  // undefined = loading; null = nothing to show.
  const [idea, setIdea] = React.useState<DailyIdea | null | undefined>(() => {
    const hit = cache.get(cacheKey);
    return hit && Date.now() - hit.at < CACHE_MS ? hit.idea : undefined;
  });
  const [failed, setFailed] = React.useState(false);
  const [viewing, setViewing] = React.useState<number | null>(null);
  const [stats, setStats] = React.useState<number[] | null>(null);

  React.useEffect(() => {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      setIdea(hit.idea);
      return;
    }
    let active = true;
    setIdea(undefined);
    setFailed(false);
    getIdeaOfTheDay(day).then(
      (found) => {
        if (!active) return;
        if (found === undefined) {
          setFailed(true);
          setIdea(null);
          return;
        }
        cache.set(cacheKey, { idea: found, at: Date.now() });
        setIdea(found);
      },
      () => {
        if (!active) return;
        setFailed(true);
        setIdea(null);
      },
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // A new idea starts with nothing opened.
  React.useEffect(() => {
    setViewing(null);
    setStats(null);
  }, [idea?.id]);

  const saved = idea ? ideaResponseFor(idea.id) : undefined;
  const answered = saved !== undefined;

  // How everyone answered: shown once the learner has answered too.
  React.useEffect(() => {
    if (!idea || !answered) return;
    let active = true;
    ideaStats(idea.id).then((counts) => active && counts && setStats(counts));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea?.id, answered]);

  if (idea === undefined) return <IdeaSkeleton />;
  if (!idea) return <IdeaEmpty day={day} failed={failed} />;

  const shownIndex = viewing ?? saved?.optionIndex ?? null;
  const shown = shownIndex === null ? null : idea.options[shownIndex];
  const totalVotes = stats ? stats.reduce((sum, n) => sum + (n ?? 0), 0) : 0;

  function pick(i: number) {
    setViewing(i);
    if (!answered && idea) {
      answerIdea(idea.id, i);
      // Count this answer straight away; the database's numbers replace it.
      setStats((s) => {
        const next = [...(s ?? [])];
        next[i] = (next[i] ?? 0) + 1;
        return next;
      });
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-col justify-between rounded-[24px] border border-transparent bg-v2-idea p-[26px] dark:border-gold-500/25">
      <div className="space-y-3.5 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-v2-navy px-2.5 py-1 text-xs font-semibold text-white">
            <Lightbulb className="h-3.5 w-3.5 text-gold-400" strokeWidth={2.2} /> Idea of the day
          </span>
          <LevelChip trackId={idea.trackId} tracks={tracks} />
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-v2-line-strong px-2.5 py-0.5 text-xs font-semibold text-muted">
            <CalendarDays className="h-3.5 w-3.5" /> {formatDay(day)}
          </span>
        </div>
        <h2 className="font-heading text-[26px] font-bold leading-[1.2] tracking-[-0.015em] text-heading">{idea.title}</h2>
        {idea.body && <p className="whitespace-pre-line text-[15px] leading-6 text-v2-body">{idea.body}</p>}
      </div>

      <div className="space-y-3">
        <p id={`idea-q-${idea.id}`} className="text-[15px] font-semibold leading-[22px] text-heading">
          {idea.question}
        </p>
        <div role="radiogroup" aria-labelledby={`idea-q-${idea.id}`} className="space-y-2">
          {idea.options.map((o, i) => {
            const on = shownIndex === i;
            const mine = saved?.optionIndex === i;
            const share = stats && totalVotes ? Math.round(((stats[i] ?? 0) / totalVotes) * 100) : null;
            return (
              <button
                key={`${i}-${o.text}`}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pick(i)}
                className={cn(
                  "relative flex w-full items-center gap-2.5 overflow-hidden rounded-2xl bg-card px-3.5 py-2.5 text-left text-sm text-heading ring-inset transition-shadow duration-200",
                  on ? "font-semibold ring-2 ring-v2-strong" : "font-medium ring-1 ring-v2-line-strong hover:ring-heading",
                )}
              >
                {/* How everyone answered, as a fill behind the answer. */}
                {share !== null && (
                  <span
                    aria-hidden
                    className={cn("absolute inset-y-0 left-0 transition-[width] duration-700 ease-out-expo", o.good ? "bg-lv-orgs-tint" : "bg-v2-gold-soft")}
                    style={{ width: `${share}%` }}
                  />
                )}
                <span
                  className={cn(
                    "relative grid h-5 w-5 shrink-0 place-items-center rounded-full",
                    on ? "bg-v2-strong text-v2-on-strong" : "border-[1.5px] border-faint bg-card",
                  )}
                >
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="relative min-w-0 flex-1">{o.text}</span>
                {mine && (
                  <span className="relative shrink-0 rounded-full bg-v2-strong px-2 py-0.5 text-[11px] font-semibold text-v2-on-strong">Your answer</span>
                )}
                {share !== null && <span className="relative shrink-0 text-xs font-semibold tabular-nums text-muted">{share}%</span>}
              </button>
            );
          })}
        </div>
        <div aria-live="polite" className="min-h-5 space-y-1.5">
          {shown ? (
            <p className="flex items-start gap-2 text-[13px] font-medium leading-5 text-v2-body">
              <span
                className={cn(
                  "mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full",
                  shown.good ? "bg-lv-orgs text-white" : "bg-gold-400 text-navy-800",
                )}
              >
                {shown.good ? <Check className="h-[11px] w-[11px]" strokeWidth={3} /> : <Info className="h-[11px] w-[11px]" strokeWidth={3} />}
              </span>
              {shown.feedback || (shown.good ? "A strong response." : "Worth a second thought.")}
            </p>
          ) : (
            <p className="text-xs font-medium text-muted">Pick one to see a response. A new idea arrives every day.</p>
          )}
          {answered && totalVotes > 0 && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Users className="h-3.5 w-3.5" /> {totalVotes} {totalVotes === 1 ? "learner has" : "learners have"} answered · tap another answer to read its feedback
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function IdeaSkeleton() {
  return (
    <div aria-busy className="flex h-full min-h-[340px] flex-col gap-4 rounded-[24px] bg-v2-idea p-[26px]">
      <span className="h-6 w-32 animate-pulse rounded-full bg-card/70" />
      <span className="h-8 w-3/4 animate-pulse rounded-lg bg-card/70" />
      <span className="h-12 w-full animate-pulse rounded-lg bg-card/60" />
      <span className="mt-auto h-10 w-full animate-pulse rounded-2xl bg-card/70" />
      <span className="h-10 w-full animate-pulse rounded-2xl bg-card/70" />
    </div>
  );
}

function IdeaEmpty({ day, failed }: { day: string; failed: boolean }) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-center rounded-[24px] border border-transparent bg-v2-idea p-[26px] dark:border-gold-500/25">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-v2-navy px-2.5 py-1 text-xs font-semibold text-white">
          <Lightbulb className="h-3.5 w-3.5 text-gold-400" strokeWidth={2.2} /> Idea of the day
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-v2-line-strong px-2.5 py-0.5 text-xs font-semibold text-muted">
          <CalendarDays className="h-3.5 w-3.5" /> {formatDay(day)}
        </span>
      </div>
      <h2 className="mt-4 font-heading text-[22px] font-bold leading-[1.25] tracking-[-0.015em] text-heading">
        {failed ? "Today’s idea could not be loaded" : "Your mentors are writing the next idea"}
      </h2>
      <p className="mt-2 text-[15px] leading-6 text-v2-body">
        {failed
          ? "Check your connection and come back to the dashboard in a moment."
          : "A short leadership idea with one question to think about. A new one arrives every day; check back tomorrow."}
      </p>
    </div>
  );
}
