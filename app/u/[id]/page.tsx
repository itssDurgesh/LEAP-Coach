"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Award, Pencil, MapPin, Briefcase, CalendarDays, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/button-variants";
import { useApp } from "@/lib/store/AppProvider";
import { tierForCredits } from "@/lib/types";

export default function PublicProfilePage() {
  return (
    <AppShell>
      <Profile />
    </AppShell>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Award; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-hair bg-card p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-gold-600">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-heading text-xl font-bold text-heading">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function Profile() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { currentUser, users, enrollments, courses, videoComments } = useApp();

  // The route param can be a user id or a @username handle.
  const user = users.find((u) => u.id === id || (u.username && u.username === id));

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-heading">Profile not found</h1>
        <p className="mt-2 text-muted">This user doesn&apos;t exist or is no longer active.</p>
        <Link href="/dashboard" className={buttonClasses({ variant: "outline", size: "md", className: "mt-5" })}>
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-navy-800 to-navy-950 dark:from-surface-2 dark:to-card" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar src={user.avatarUrl} name={user.name} size={88} className="ring-4 ring-card" />
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-heading text-2xl font-bold text-heading">{user.name}</h1>
                  {isAdmin ? (
                    <Badge variant="navy">Admin</Badge>
                  ) : (
                    user.role && <Badge variant="navy" className="capitalize">{user.role}</Badge>
                  )}
                </div>
                {user.username && <p className="mt-0.5 text-sm font-medium text-gold-700">@{user.username}</p>}
                {user.headline && <p className="mt-0.5 text-sm text-muted">{user.headline}</p>}
              </div>
            </div>
            {isMe && (
              <Link href="/account" className={buttonClasses({ variant: "outline", size: "sm" })}>
                <Pencil className="h-4 w-4" /> Edit profile
              </Link>
            )}
          </div>

          {/* meta row */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted">
            {!isAdmin && (
              <span className="inline-flex items-center gap-1.5">
                <Award className="h-4 w-4 text-gold-600" /> {tier.label}
              </span>
            )}
            {user.company && (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" /> {user.company}
              </span>
            )}
            {user.region && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {user.region}
                {user.nationality ? `, ${user.nationality}` : ""}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> Joined {memberSince}
            </span>
          </div>
        </div>
      </Card>

      {/* Stats (learners only) */}
      {!isAdmin && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={Sparkles} value={user.learningCredits} label="Learning credits" />
          <Stat icon={BookOpen} value={enrolledCourses.length} label="Topics enrolled" />
          <Stat icon={MessageCircle} value={commentCount} label="Discussion comments" />
        </div>
      )}

      {/* Bio */}
      {user.bio && (
        <Card padded>
          <h2 className="font-heading text-lg font-semibold text-heading">About</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-muted">{user.bio}</p>
        </Card>
      )}

      {/* Enrolled topics */}
      {enrolledCourses.length > 0 && (
        <Card padded>
          <h2 className="font-heading text-lg font-semibold text-heading">Coaching topics</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {enrolledCourses.map((c) => (
              <Link
                key={c.id}
                href={`/courses/${c.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-surface px-3 py-1.5 text-sm font-medium text-heading hover:border-gold-300"
              >
                <BookOpen className="h-3.5 w-3.5 text-gold-600" /> {c.title}
              </Link>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}
