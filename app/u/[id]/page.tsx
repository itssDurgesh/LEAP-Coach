"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, BookOpen, Briefcase, CalendarDays, Check, MapPin, MessageCircle, Pencil, Star, Trophy, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { StampGrid } from "@/components/v2/StampGrid";
import { LevelChip, V2Card, V2_AVATAR, v2Button } from "@/components/v2/ui";
import { computeStamps } from "@/lib/stamps";
import { useApp } from "@/lib/store/AppProvider";
import { tierForCredits } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PublicProfilePage() {
  return (
    <AppShell>
      <Profile />
    </AppShell>
  );
}

const CHIP = "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold leading-[18px]";
const HEADING = "font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading";
// Topics listed before "And N more topics".
const TOPICS_SHOWN = 5;

function Stat({ icon: Icon, tint, value, label }: { icon: LucideIcon; tint: string; value: React.ReactNode; label: string }) {
  return (
    <V2Card className="flex items-center gap-4 p-[22px]">
      <span className={cn("grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl", tint)}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="font-heading text-[32px] font-bold leading-9 tracking-[-0.015em] text-heading">{value}</p>
        <p className="text-[13px] font-medium text-muted">{label}</p>
      </div>
    </V2Card>
  );
}

function Profile() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { currentUser, users, enrollments, courses, tracks, videoComments, submissions, progress, courseProgress } = useApp();
  const [allTopics, setAllTopics] = React.useState(false);

  // The route param can be a user id or a @username handle.
  const user = users.find((u) => u.id === id || (u.username && u.username === id));

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-[-0.015em] text-heading">Profile not found</h1>
        <p className="mt-2 text-v2-body">This user doesn&apos;t exist or is no longer active.</p>
        <Link href="/dashboard" className={v2Button("outline", "md", "mt-5")}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  const tier = tierForCredits(user.learningCredits);
  const isMe = currentUser?.id === user.id;
  const isAdmin = user.isAdmin;
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  const enrolledCourses = enrollments
    .filter((e) => e.userId === user.id)
    .map((e) => courses.find((c) => c.id === e.courseId))
    .filter(Boolean) as typeof courses;
  const commentCount = videoComments.filter((c) => c.userId === user.id).length;
  const shownTopics = allTopics ? enrolledCourses : enrolledCourses.slice(0, TOPICS_SHOWN);
  const hiddenTopics = enrolledCourses.length - shownTopics.length;

  // Progress is private to each learner, so stamps can only be worked out for your own profile.
  const stamps = isMe && !isAdmin ? computeStamps(user, courses, submissions, progress) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <V2Card className="flex flex-wrap items-center gap-6 p-7">
        <Avatar src={user.avatarUrl} name={user.name} size={96} ring={false} className={V2_AVATAR} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-[32px] font-bold leading-[38px] tracking-[-0.015em] text-heading">{user.name}</h1>
            {isAdmin ? (
              <span className={cn(CHIP, "bg-surface text-v2-body")}>Admin</span>
            ) : (
              user.role && <span className={cn(CHIP, "bg-surface capitalize text-v2-body")}>{user.role}</span>
            )}
          </div>
          {user.username && <p className="text-[13px] font-semibold leading-5 text-v2-gold-text">@{user.username}</p>}
          {user.headline && <p className="text-[15px] leading-6 text-v2-body">{user.headline}</p>}
          <div className="flex flex-wrap gap-2 pt-1.5">
            {!isAdmin && (
              <span className={cn(CHIP, "bg-v2-gold-soft text-v2-gold-text")}>
                <Trophy className="h-3.5 w-3.5" /> {tier.label} tier
              </span>
            )}
            {user.company && (
              <span className={cn(CHIP, "bg-surface text-v2-body")}>
                <Briefcase className="h-3.5 w-3.5" /> {user.company}
              </span>
            )}
            {user.region && (
              <span className={cn(CHIP, "bg-surface text-v2-body")}>
                <MapPin className="h-3.5 w-3.5" /> {user.region}
                {user.nationality ? `, ${user.nationality}` : ""}
              </span>
            )}
            <span className={cn(CHIP, "bg-surface text-v2-body")}>
              <CalendarDays className="h-3.5 w-3.5" /> Joined {memberSince}
            </span>
          </div>
        </div>
        {isMe && (
          <Link href="/account" className={v2Button("outline", "sm")}>
            <Pencil className="h-3.5 w-3.5" /> Edit profile
          </Link>
        )}
      </V2Card>

      {/* Stats (learners only) */}
      {!isAdmin && (
        <div className="grid gap-6 sm:grid-cols-3">
          <Stat icon={Star} tint="bg-v2-gold-soft text-v2-gold-text" value={user.learningCredits} label="Learning credits" />
          <Stat icon={BookOpen} tint="bg-lv-self-tint text-lv-self-dark" value={enrolledCourses.length} label="Topics enrolled" />
          <Stat icon={MessageCircle} tint="bg-lv-peers-tint text-lv-peers-dark" value={commentCount} label="Discussion comments" />
        </div>
      )}

      <div className={cn("grid gap-6 lg:items-start", stamps && "lg:grid-cols-[minmax(0,1fr)_416px]")}>
        <div className="min-w-0 space-y-6">
          {user.bio && (
            <V2Card className="space-y-2.5 p-6">
              <h2 className={HEADING}>About</h2>
              <p className="whitespace-pre-line text-[15px] leading-6 text-v2-body">{user.bio}</p>
            </V2Card>
          )}

          {enrolledCourses.length > 0 && (
            <V2Card className="p-6">
              <div className="flex items-center justify-between gap-3 pb-2">
                <h2 className={HEADING}>Coaching topics</h2>
                <span className="text-[13px] font-medium text-muted">{enrolledCourses.length} enrolled</span>
              </div>
              {shownTopics.map((c) => {
                const { pct, completed } = courseProgress(c.id, user.id);
                return (
                  <div key={c.id} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 py-2.5">
                    <Link href={`/courses/${c.slug}`} className="min-w-0 flex-1 text-sm font-semibold leading-5 text-heading hover:underline">
                      {c.title}
                    </Link>
                    <LevelChip trackId={c.tracks[0]} tracks={tracks} />
                    {/* Progress is private to each learner, so the status shows only on your own profile. */}
                    {!isMe ? null : pct === 100 ? (
                      <span className={cn(CHIP, "bg-lv-orgs-tint text-lv-orgs-dark")}>
                        <Check className="h-3.5 w-3.5" strokeWidth={3} /> Finished
                      </span>
                    ) : completed > 0 ? (
                      <span className={cn(CHIP, "bg-v2-gold-soft text-v2-gold-text")}>In progress</span>
                    ) : (
                      <span className={cn(CHIP, "bg-surface text-v2-body")}>Not started</span>
                    )}
                  </div>
                );
              })}
              {hiddenTopics > 0 && (
                <button type="button" onClick={() => setAllTopics(true)} className={v2Button("ghost", "sm", "mt-2 px-1")}>
                  And {hiddenTopics} more {hiddenTopics === 1 ? "topic" : "topics"} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </V2Card>
          )}
        </div>

        {stamps && (
          <V2Card className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className={HEADING}>Stamps</h2>
              <span className="text-[13px] font-medium text-muted">
                {stamps.filter((s) => s.earned).length} of {stamps.length} earned
              </span>
            </div>
            <StampGrid stamps={stamps} />
          </V2Card>
        )}
      </div>
    </div>
  );
}
