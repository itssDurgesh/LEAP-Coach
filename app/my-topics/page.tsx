"use client";

import Link from "next/link";
import { BookMarked, Sparkles, Layers } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { CourseCard } from "@/components/CourseCard";
import { PlanBadge } from "@/components/app/PlanBadge";
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

  const summary = [
    { label: "Current plan", value: plan.label, icon: Sparkles },
    { label: "Catalogs unlocked", value: `${allAccess ? 3 : plan.categories} of 3`, icon: Layers },
    { label: "Topics owned", value: String(owned.length), icon: BookMarked },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your library"
        title="My topics"
        description="Every coaching topic you've unlocked, in one place."
        actions={<PlanBadge user={currentUser} withMenu />}
      />

      {/* ── Plan / catalog summary ── */}
      <Panel padded={false} className="px-5 py-5">
        <div className="grid gap-y-5 sm:grid-cols-3">
          {summary.map((s) => (
            <div
              key={s.label}
              className="border-l border-hair pl-5 first:border-l-0 first:pl-0 sm:pl-7 sm:first:pl-0"
            >
              <s.icon className="h-4 w-4 text-gold-600" />
              <p className="mt-2.5 font-heading text-xl font-bold leading-none text-heading">
                {s.value}
              </p>
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              Your catalogs
            </span>
            {allAccess ? (
              <span className="rounded-full bg-gold-500 px-3 py-1 font-heading text-xs font-bold text-navy-900">
                All-access
              </span>
            ) : ownedCategories.length > 0 ? (
              ownedCategories.map((cat) => (
                <span
                  key={cat}
                  className="rounded-full bg-surface-2 px-3 py-1 font-heading text-xs font-semibold text-heading"
                >
                  {roleLabel(cat)}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted">None yet</span>
            )}
          </div>
          <Link href="/pricing" className={buttonClasses({ variant: "outline", size: "sm" })}>
            Upgrade plan
          </Link>
        </div>
      </Panel>

      {owned.length === 0 ? (
        <Panel className="py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-faint">
            <BookMarked className="h-6 w-6" />
          </span>
          <p className="mt-4 font-heading text-lg font-bold text-heading">No topics yet</p>
          <p className="mt-1.5 text-sm text-muted">
            You haven&rsquo;t unlocked any coaching topics. Explore the catalog to get started.
          </p>
          <Link
            href="/courses"
            className={buttonClasses({ variant: "primary", size: "md", className: "mt-6" })}
          >
            Browse the catalog
          </Link>
        </Panel>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {owned.map((c) => {
            const { pct } = courseProgress(c.id);
            const exp = courseExpiresAt(c.id);
            const expired = !!exp && Date.parse(exp) < Date.now();
            return (
              <div key={c.id} className="flex flex-col gap-2">
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
