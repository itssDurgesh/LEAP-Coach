"use client";

import Link from "next/link";
import { BookMarked, Sparkles, Layers } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { PlanBadge } from "@/components/app/PlanBadge";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/button-variants";
import { useApp } from "@/lib/store/AppProvider";
import { ROLES, courseCategories, planFor, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function MyTopicsPage() {
  return (
    <AppShell>
      <MyTopics />
    </AppShell>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const roleLabel = (r: Role) => ROLES.find((x) => x.id === r)?.label ?? r;

function MyTopics() {
  const { currentUser, courses, isEnrolled, courseProgress, courseExpiresAt } = useApp();
  if (!currentUser) return null;

  const ownedCategories = currentUser.ownedCategories ?? [];
  const allAccess = currentUser.subscriptionPlan === "all_access";
  const plan = planFor(currentUser);

  // "My topics" = everything the learner has actually acquired: enrolled, bought
  // à-la-carte, unlocked by a category pass, or covered by the all-access plan.
  const owned = courses.filter(
    (c) =>
      isEnrolled(c.id) ||
      currentUser.ownedCourseIds.includes(c.id) ||
      (allAccess && c.published) ||
      courseCategories(c).some((cat) => ownedCategories.includes(cat)),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 font-heading text-3xl font-bold text-heading">
            <BookMarked className="h-7 w-7 text-gold-500" /> My Topics
          </h1>
          <p className="mt-1.5 text-muted">Every coaching topic you&rsquo;ve unlocked, in one place.</p>
        </div>
        <PlanBadge user={currentUser} withMenu />
      </header>

      {/* Plan / catalog summary */}
      <Card padded className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Current plan</p>
          <p className="mt-1 flex items-center gap-2 font-heading text-lg font-bold text-heading">
            <Sparkles className="h-4 w-4 text-gold-500" /> {plan.label}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Catalogs unlocked</p>
          <p className="mt-1 flex items-center gap-2 font-heading text-lg font-bold text-heading">
            <Layers className="h-4 w-4 text-gold-500" /> {allAccess ? 3 : plan.categories} of 3
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Topics owned</p>
          <p className="mt-1 font-heading text-lg font-bold text-heading">{owned.length}</p>
        </div>
        {(allAccess || ownedCategories.length > 0) && (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">Your catalogs</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {allAccess ? (
                <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-700 dark:bg-gold-500/15">
                  All-access
                </span>
              ) : (
                ownedCategories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-heading"
                  >
                    {roleLabel(cat)}
                  </span>
                ))
              )}
            </div>
          </div>
        )}
        <Link
          href="/pricing"
          className={buttonClasses({ variant: "outline", size: "sm", className: "ml-auto" })}
        >
          Upgrade plan
        </Link>
      </Card>

      {owned.length === 0 ? (
        <Card padded className="text-center">
          <BookMarked className="mx-auto h-9 w-9 text-faint" />
          <p className="mt-3 font-heading text-lg font-semibold text-heading">No topics yet</p>
          <p className="mt-1 text-sm text-muted">
            You haven&rsquo;t unlocked any coaching topics. Explore the catalog to get started.
          </p>
          <Link
            href="/courses"
            className={buttonClasses({ variant: "primary", size: "md", className: "mt-5" })}
          >
            Browse the catalog
          </Link>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {owned.map((c) => {
            const { pct } = courseProgress(c.id);
            const exp = courseExpiresAt(c.id);
            const expired = !!exp && Date.parse(exp) < Date.now();
            return (
              <div key={c.id} className="flex flex-col gap-1.5">
                <CourseCard course={c} enrolled progressPct={pct} />
                {exp && (
                  <p className={cn("px-1 text-xs font-medium", expired ? "text-red-600" : "text-faint")}>
                    {expired
                      ? "Access expired. Renew from the topic page"
                      : `Access valid until ${fmtDate(exp)}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
