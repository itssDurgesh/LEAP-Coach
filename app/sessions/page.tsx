"use client";

import { Video } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { SessionCard } from "@/components/SessionCard";
import { Card } from "@/components/ui/Card";
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
    .filter((s) => s.targetRole === role || s.targetRole === "all")
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold text-heading">Live Sessions</h1>
        <p className="mt-1.5 text-muted">
          Join live AMAs, clinics, and office hours. Vote to attend and we&rsquo;ll remind you a day before.
        </p>
      </header>

      {list.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {list.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      ) : (
        <Card padded className="flex flex-col items-center py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-gold-600">
            <Video className="h-6 w-6" />
          </span>
          <p className="mt-3 font-heading text-lg font-semibold text-heading">No sessions scheduled yet</p>
          <p className="mt-1 text-sm text-muted">Check back soon. We add new live sessions regularly.</p>
        </Card>
      )}
    </div>
  );
}
