"use client";

import { Video } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { SessionCard } from "@/components/SessionCard";
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
      <PageHeader
        eyebrow="Live"
        title="Live sessions"
        description="Join live AMAs, clinics, and office hours. Vote to attend and we'll remind you a day before."
      />

      {list.length ? (
        <div className="grid gap-6 md:grid-cols-2">
          {list.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      ) : (
        <Panel className="flex flex-col items-center py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-gold-600">
            <Video className="h-6 w-6" />
          </span>
          <p className="mt-4 font-heading text-lg font-bold text-heading">No sessions scheduled yet</p>
          <p className="mt-1.5 text-sm text-muted">
            Check back soon. We add new live sessions regularly.
          </p>
        </Panel>
      )}
    </div>
  );
}
