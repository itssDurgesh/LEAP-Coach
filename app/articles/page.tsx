"use client";

import Image from "next/image";
import Link from "next/link";
import { Newspaper, CalendarDays, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { canOptimize } from "@/lib/images";
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="From the desk"
        title="Articles"
        description="Essays and insights from your mentors, straight from the LEAP desk."
      />

      {published.length === 0 ? (
        <Panel className="py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-faint">
            <Newspaper className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm text-muted">No articles yet. Check back soon.</p>
        </Panel>
      ) : (
        <div className="space-y-6">
          {published.map((a) => {
            const author = users.find((u) => u.id === a.authorId);
            return (
              <Link
                key={a.id}
                href={`/articles/${a.id}`}
                className="group block overflow-hidden rounded-3xl border border-hair bg-card transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:border-gold-300 hover:shadow-lift"
              >
                {a.coverUrl && (
                  <div className="relative aspect-[21/9] overflow-hidden">
                    <Image
                      src={a.coverUrl}
                      alt={a.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      unoptimized={!canOptimize(a.coverUrl)}
                      className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.03]"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h2 className="font-heading text-xl font-bold leading-snug text-heading transition-colors duration-200 group-hover:text-gold-700">
                    {a.title}
                  </h2>
                  <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-muted">
                    {articleExcerpt(a)}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-4">
                    <span className="flex items-center gap-2.5">
                      <Avatar src={author?.avatarUrl} name={a.authorName} size={30} />
                      <span className="text-sm font-semibold text-heading">{a.authorName}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-faint">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(a.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-gold-700">
                      Read
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
