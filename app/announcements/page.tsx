"use client";

import { Pin } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { Badge } from "@/components/ui/Badge";
import { useApp } from "@/lib/store/AppProvider";
import { timeAgo } from "@/lib/utils";

export default function AnnouncementsPage() {
  return (
    <AppShell>
      <Announcements />
    </AppShell>
  );
}

function Announcements() {
  const { announcements, currentUser } = useApp();
  if (!currentUser) return null;
  const role = currentUser.role;

  const list = announcements
    .filter((a) => a.published && (a.targetRole === "all" || a.targetRole === role))
    .sort((a, b) =>
      a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : a.createdAt < b.createdAt ? 1 : -1,
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="From the team"
        title="Announcements"
        description="Updates and news from the LEAP Coach team."
      />

      {list.length === 0 ? (
        <Panel className="py-16 text-center text-muted">
          No announcements yet. Check back soon.
        </Panel>
      ) : (
        <div className="space-y-5">
          {list.map((a) => (
            <Panel
              key={a.id}
              className={a.pinned ? "border-gold-300 dark:border-gold-500/25" : undefined}
            >
              <div className="flex flex-wrap items-center gap-2">
                {a.pinned && (
                  <Badge variant="gold">
                    <Pin className="h-3 w-3" /> Pinned
                  </Badge>
                )}
                {a.targetRole !== "all" && (
                  <Badge variant="neutral" className="capitalize">
                    {a.targetRole}s
                  </Badge>
                )}
                <span className="text-xs text-faint">
                  {a.authorName} · {timeAgo(a.createdAt)}
                </span>
              </div>
              <h2 className="mt-3 font-heading text-lg font-bold text-heading">{a.title}</h2>
              <p className="mt-2.5 whitespace-pre-line leading-[1.75] text-muted">{a.body}</p>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
