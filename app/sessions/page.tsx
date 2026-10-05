"use client";

import { Video } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { SessionCard, isUpcoming } from "@/components/SessionCard";
import { PageHead, V2Card } from "@/components/v2/ui";
import { useApp } from "@/lib/store/AppProvider";

export default function SessionsPage() {
  return (
    <AppShell>
      <Sessions />
    </AppShell>
  );
}

function Sessions() {
  const { currentUser, sessions } = useApp();
  const role = currentUser!.role;

  const list = sessions
    .filter((s) => (s.targetRole === role || s.targetRole === "all") && isUpcoming(s))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));

  return (
    <div className="space-y-7">
      <PageHead
        title="Live sessions"
        description="Vote to attend and we will remind you a day before."
        actions={
          list.length > 0 && (
            <span className="rounded-full border border-hair bg-card px-3 py-1.5 text-xs font-semibold leading-[18px] text-v2-body">
              {list.length} upcoming
            </span>
          )
        }
      />

      {list.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      ) : (
        <V2Card className="px-6 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-v2-gold-soft text-v2-gold-text">
            <Video className="h-6 w-6" />
          </span>
          <p className="mt-4 font-heading text-lg font-semibold text-heading">No sessions scheduled yet</p>
          <p className="mt-1.5 text-sm text-v2-body">Check back soon. We add new live sessions regularly.</p>
        </V2Card>
      )}
    </div>
  );
}
