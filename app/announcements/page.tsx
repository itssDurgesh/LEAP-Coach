"use client";

import { Megaphone, Pin } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
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
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-gold-600">
          <Megaphone className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-heading text-3xl font-bold text-heading">Announcements</h1>
          <p className="mt-0.5 text-muted">Updates and news from the LEAP Coach team.</p>
        </div>
      </header>

      {list.length === 0 ? (
        <Card padded className="text-center text-muted">No announcements yet — check back soon.</Card>
      ) : (
        list.map((a) => (
          <Card key={a.id} padded className={a.pinned ? "border-gold-200" : undefined}>
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
            <h2 className="mt-2 font-heading text-lg font-bold text-heading">{a.title}</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-muted">{a.body}</p>
          </Card>
        ))
      )}
    </div>
  );
}
