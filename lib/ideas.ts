import type { DailyIdea, Role } from "@/lib/types";

/**
 * Which Idea of the day a learner sees, and when it changes.
 *
 * Days are counted in India time (UTC+5:30, no daylight saving), so every learner
 * gets the same idea on the same calendar day and it changes at midnight IST,
 * whatever their device's clock zone is set to.
 *
 * The rule, for one audience (a learner's path):
 *   1. An active idea pinned to today's date wins.
 *   2. Otherwise the rotation: the active, unpinned ideas in their admin order,
 *      advancing by one each day and starting over after the last. Adding three or
 *      five at once simply makes a longer cycle.
 * A pinned idea appears only on its date, never in the rotation.
 */

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86_400_000;

/** Whole days since 1970-01-01 in India time. */
export function indiaDayNumber(now: number = Date.now()): number {
  return Math.floor((now + IST_OFFSET_MS) / DAY_MS);
}

/** "YYYY-MM-DD" of the India-time day `offsetDays` after `now`'s. */
export function indiaDateKey(now: number = Date.now(), offsetDays = 0): string {
  return new Date((indiaDayNumber(now) + offsetDays) * DAY_MS).toISOString().slice(0, 10);
}

/** Milliseconds until the next midnight in India, when the idea changes. */
export function msUntilNextIndiaDay(now: number = Date.now()): number {
  return (indiaDayNumber(now) + 1) * DAY_MS - IST_OFFSET_MS - now;
}

const forAudience = (idea: DailyIdea, role: Role | "all") =>
  idea.active && (idea.targetRole === "all" || role === "all" || idea.targetRole === role);

/** Admin order, then oldest first: the same for every learner and every render. */
const byOrder = (a: DailyIdea, b: DailyIdea) =>
  a.order - b.order || (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1);

/** The rotation for an audience, in the order the admin set. */
export function rotation(ideas: DailyIdea[], role: Role | "all"): DailyIdea[] {
  return ideas.filter((i) => forAudience(i, role) && !i.showOn).sort(byOrder);
}

/** The idea for `role` on the India-time day `offsetDays` after today; null when there is none. */
export function ideaForDay(ideas: DailyIdea[], role: Role | "all", now: number = Date.now(), offsetDays = 0): DailyIdea | null {
  const day = indiaDateKey(now, offsetDays);
  const pinned = ideas.filter((i) => forAudience(i, role) && i.showOn === day).sort(byOrder)[0];
  if (pinned) return pinned;
  const pool = rotation(ideas, role);
  if (!pool.length) return null;
  return pool[(indiaDayNumber(now) + offsetDays) % pool.length];
}
