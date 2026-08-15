"use client";

import Link from "next/link";
import { Newspaper, CalendarDays, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/lib/store/AppProvider";
import { articleExcerpt } from "@/lib/types";

export default function ArticlesPage() {
  return (
    <AppShell>
      <Articles />
    </AppShell>
  );
}

function Articles() {
  const { articles, users } = useApp();
  const published = articles
    .filter((a) => a.published && !a.archived)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="font-heading text-3xl font-bold text-heading">Articles</h1>
        <p className="mt-1.5 text-muted">Essays and insights from your mentors, straight from the LEAP desk.</p>
      </header>

      {published.length === 0 && (
        <Card padded className="text-center text-muted">
          <Newspaper className="mx-auto h-8 w-8 text-faint" />
          <p className="mt-3 text-sm">No articles yet. Check back soon.</p>
        </Card>
      )}

      <div className="space-y-4">
        {published.map((a) => {
          const author = users.find((u) => u.id === a.authorId);
          return (
            <Link key={a.id} href={`/articles/${a.id}`} className="block">
              <Card hover className="overflow-hidden">
                {a.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.coverUrl} alt={a.title} className="h-44 w-full object-cover" />
                )}
                <div className="p-5">
                  <h2 className="font-heading text-xl font-bold leading-snug text-heading">{a.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{articleExcerpt(a)}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-2.5">
                      <Avatar src={author?.avatarUrl} name={a.authorName} size={30} />
                      <span className="text-sm font-medium text-heading">{a.authorName}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-faint">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold-600">
                      Read <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
