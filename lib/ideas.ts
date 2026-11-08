import type { DailyIdea, Role } from "@/lib/types";

/**
 * Idea of the day: which idea a learner sees on a given day.
 *
 * Admins write ideas and schedule them for dates (Admin → Idea of the Day). On a
 * learner's calendar day the dashboard shows:
 *   1. the active idea scheduled for that day, for the learner's path or for
 *      everyone (one for their path wins);
 *   2. otherwise the next idea in a daily rotation of the active ideas scheduled
 *      before that day or never scheduled, so the card still changes every day
 *      when the schedule has run out.
 *
 * The database does the same in public.idea_for_day() (supabase/database.sql),
 * which is what learners' dashboards call. This copy powers the admin's schedule
 * preview and the local demo, so both must stay in step.
 */

/** Days are counted from here for the rotation. Any fixed date works; it must match the SQL. */
const ROTATION_EPOCH = Date.UTC(2024, 0, 1);

/** A local calendar date as YYYY-MM-DD (the learner's own "today"). */
export function localDay(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** YYYY-MM-DD `n` days after `day` (n may be negative). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - ROTATION_EPOCH) / 86_400_000);
}

/** "Mon 10 Nov" for a YYYY-MM-DD date. */
export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", opts);
}

// Plain code-unit comparison, the same as `collate "C"` in the SQL.
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** The idea `role` sees on `day` (YYYY-MM-DD). `role` null = an idea for everyone. */
export function ideaForDay(ideas: DailyIdea[], role: Role | null, day: string): DailyIdea | null {
  const pool = ideas.filter((i) => i.active && (i.audience === "all" || i.audience === role));
  const scheduled = pool
    .filter((i) => i.showOn === day)
    .sort(
      (a, b) =>
        Number(b.audience !== "all") - Number(a.audience !== "all") ||
        cmp(b.createdAt, a.createdAt) ||
        cmp(a.id, b.id),
    );
  if (scheduled.length) return scheduled[0];

  const rotation = pool
    .filter((i) => !i.showOn || i.showOn < day)
    .sort((a, b) => {
      if (a.showOn !== b.showOn) {
        if (!a.showOn) return 1; // nulls last
        if (!b.showOn) return -1;
        return cmp(a.showOn, b.showOn);
      }
      return cmp(a.createdAt, b.createdAt) || cmp(a.id, b.id);
    });
  if (!rotation.length) return null;
  const n = rotation.length;
  return rotation[((dayNumber(day) % n) + n) % n];
}

/**
 * The first `count` days from `from` (inclusive) that have no idea scheduled for
 * everyone yet: where a batch of new ideas goes by default.
 */
export function nextFreeDays(ideas: DailyIdea[], count: number, from: string): string[] {
  const taken = new Set(ideas.filter((i) => i.active && i.audience === "all" && i.showOn).map((i) => i.showOn as string));
  const out: string[] = [];
  for (let day = from; out.length < count; day = addDays(day, 1)) if (!taken.has(day)) out.push(day);
  return out;
}

/** The last day that has an idea scheduled for everyone, from `from` on; null when none is. */
export function scheduledUntil(ideas: DailyIdea[], from: string): string | null {
  const days = ideas
    .filter((i) => i.active && i.audience === "all" && i.showOn && i.showOn >= from)
    .map((i) => i.showOn as string)
    .sort();
  return days.length ? days[days.length - 1] : null;
}

/** An idea is complete enough to show: a title, a question and at least two options with text. */
export function ideaProblems(i: Pick<DailyIdea, "title" | "question" | "options">): string[] {
  const out: string[] = [];
  if (!i.title.trim()) out.push("a title");
  if (!i.question.trim()) out.push("a question");
  const filled = i.options.filter((o) => o.text.trim());
  if (filled.length < 2) out.push("at least two answers");
  else if (!filled.some((o) => o.good)) out.push("one answer marked as the good one");
  return out;
}
