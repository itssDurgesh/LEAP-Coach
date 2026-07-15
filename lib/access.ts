// ─────────────────────────────────────────────────────────────────────────────
// Access & expiry — the single source of truth for "can this learner open this
// topic, and until when?".
//
// RULE: every purchase — a single topic OR a whole catalog (category pass) OR
// all-access — grants exactly ONE YEAR of access, counted from its own purchase
// date. A learner may hold several overlapping entitlements to the same topic
// (bought it à-la-carte, AND owns a catalog pass over its category, AND/OR holds
// all-access); each carries its own independent one-year window, so the topic
// stays open until the LATEST of those windows closes. After that they must buy
// again. Free topics never expire.
//
// This module is framework-agnostic (no "use client"/"server-only") so the same
// math backs the browser store, the server pricing/grant routes, and any tooling.
// ─────────────────────────────────────────────────────────────────────────────
import type { Course, Role, User } from "./types";
import { courseCategories } from "./types";

/** Every purchase grants one year of access. */
export const ACCESS_DURATION_DAYS = 365;
export const ACCESS_DURATION_YEARS = 1;

const DAY_MS = 86_400_000;
const ALL_CATEGORIES: Role[] = ["student", "professional", "entrepreneur"];

/** ISO timestamp `days` after `fromIso` — turns a purchase date into an expiry. */
export function addDays(fromIso: string, days: number): string {
  return new Date(new Date(fromIso).getTime() + days * DAY_MS).toISOString();
}

/**
 * The access window (in days) for an à-la-carte topic purchase. Standard is one
 * year; an admin MAY set a per-topic override on the course (Course Wizard →
 * "access duration"). Catalog passes & all-access always use the standard year.
 */
export function courseAccessDays(course: Pick<Course, "accessDurationDays">): number {
  const d = course.accessDurationDays;
  return d && d > 0 ? d : ACCESS_DURATION_DAYS;
}

type AccessUser = Pick<
  User,
  | "subscriptionPlan"
  | "subscriptionValidUntil"
  | "ownedCategories"
  | "categoryPassAt"
  | "ownedCourseIds"
  | "coursePurchasedAt"
>;
type AccessCourse = Pick<Course, "id" | "price" | "category" | "categories" | "accessDurationDays">;

const isPast = (iso: string, now: number) => Date.parse(iso) < now;

/**
 * The catalogs whose one-year pass is STILL ACTIVE for this user (all-access,
 * while valid, counts as all three). Expired passes are excluded — that's what
 * lets a lapsed catalog be re-purchased (and stops it from silently discounting
 * a pay-the-difference upgrade). Undated legacy passes are treated as active.
 */
export function activeCategories(user: AccessUser | null | undefined, now: number = Date.now()): Set<Role> {
  const active = new Set<Role>();
  if (!user) return active;
  if (user.subscriptionPlan === "all_access") {
    const vu = user.subscriptionValidUntil;
    if (!vu || !isPast(vu, now)) return new Set(ALL_CATEGORIES); // valid (or undated ⇒ lifetime)
  }
  for (const cat of user.ownedCategories ?? []) {
    const at = user.categoryPassAt?.[cat];
    if (!at || !isPast(addDays(at, ACCESS_DURATION_DAYS), now)) active.add(cat); // undated ⇒ lifetime
  }
  return active;
}

/** How many catalogs the user actively holds right now (0–3). Drives pay-the-difference math. */
export function activeCategoryCount(user: AccessUser | null | undefined, now: number = Date.now()): number {
  return activeCategories(user, now).size;
}

/**
 * The effective access-expiry for `user` on `course` as an ISO date, or `null`
 * when access never lapses — a free topic, or an entitlement with no recorded
 * purchase date (treated as lifetime so an existing learner is never locked out).
 * Returns the LATEST expiry across every entitlement that grants this topic.
 */
export function courseAccessExpiry(
  user: AccessUser | null | undefined,
  course: AccessCourse | null | undefined,
): string | null {
  if (!course) return null;
  if ((course.price ?? 0) === 0) return null; // free topics never expire
  if (!user) return null;

  const windows: string[] = [];
  let lifetime = false; // an entitlement we can't date ⇒ never expires (legacy-safe)

  // All-access: subscriptionValidUntil already stores (purchase date + 1 year).
  if (user.subscriptionPlan === "all_access") {
    if (user.subscriptionValidUntil) windows.push(user.subscriptionValidUntil);
    else lifetime = true;
  }
  // Catalog passes covering this topic's category — each its own one-year window.
  const owned = new Set(user.ownedCategories ?? []);
  for (const cat of courseCategories(course)) {
    if (!owned.has(cat)) continue;
    const at = user.categoryPassAt?.[cat];
    if (at) windows.push(addDays(at, ACCESS_DURATION_DAYS));
    else lifetime = true;
  }
  // À-la-carte purchase of this exact topic — its own window.
  if ((user.ownedCourseIds ?? []).includes(course.id)) {
    const at = user.coursePurchasedAt?.[course.id];
    if (at) windows.push(addDays(at, courseAccessDays(course)));
    else lifetime = true;
  }

  if (lifetime) return null;
  if (windows.length === 0) return null; // not entitled here — hasGrant() gates access
  return windows.reduce((latest, w) => (w > latest ? w : latest));
}

/** Whether the user's access to `course` has lapsed (they own it but the year is up). */
export function isCourseAccessExpired(
  user: AccessUser | null | undefined,
  course: AccessCourse | null | undefined,
  now: number = Date.now(),
): boolean {
  const exp = courseAccessExpiry(user, course);
  return !!exp && isPast(exp, now);
}
