"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Newspaper } from "lucide-react";
import { TopicCard } from "@/components/v2/TopicCard";
import { SegTabs, V2Card, v2Button } from "@/components/v2/ui";
import { canOptimize } from "@/lib/images";
import { useApp } from "@/lib/store/AppProvider";
import { articleExcerpt, ownsTopic } from "@/lib/types";
import type { Article, Course, LeadershipTrack, RecommendedResource } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

type ExploreTab = "topics" | "resources" | "articles";

// Resources have no page of their own, so that tab shows no "see all" button.
const MORE: Record<ExploreTab, { label: string; href: string } | null> = {
  topics: { label: "Browse catalog", href: "/courses" },
  resources: null,
  articles: { label: "All articles", href: "/articles" },
};

/** Recommended topics, resources and the latest articles in one section with tabs. */
export function ExploreTabs({ topics, resources, articles, tracks }: { topics: Course[]; resources: RecommendedResource[]; articles: Article[]; tracks: LeadershipTrack[] }) {
  const tabs = (
    [
      { id: "topics", label: "For you", count: topics.length },
      { id: "resources", label: "Resources", count: resources.length },
      { id: "articles", label: "Articles", count: articles.length },
    ] as { id: ExploreTab; label: string; count: number }[]
  ).filter((t) => t.count > 0);
  const { currentUser, isEnrolled } = useApp();
  const [tab, setTab] = React.useState<ExploreTab>(tabs[0]?.id ?? "topics");
  if (tabs.length === 0) return null;
  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <h2 className="font-heading text-2xl font-bold leading-[30px] tracking-[-0.015em] text-heading">Explore</h2>
          <SegTabs value={active} onChange={setTab} tabs={tabs} />
        </div>
        {MORE[active] && (
          <Link href={MORE[active].href} className={v2Button("outline", "sm")}>
            {MORE[active].label} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {active === "topics" && (
        <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {topics.map((c) => (
            <TopicCard key={c.id} course={c} tracks={tracks} owned={!!currentUser && ownsTopic(currentUser, c, isEnrolled(c.id))} />
          ))}
        </div>
      )}

      {active === "resources" && (
        <div className="mt-5 grid gap-6 md:grid-cols-3">
          {resources.map((r) => {
            const book = r.type === "book";
            const Icon = book ? BookOpen : Newspaper;
            return (
              <V2Card key={r.id} className="flex items-start gap-4 p-5">
                <span
                  className={cn(
                    "flex h-[72px] w-[60px] shrink-0 flex-col items-center justify-center gap-1 rounded-[14px]",
                    book ? "bg-lv-upwards-tint text-lv-upwards-dark" : "bg-lv-peers-tint text-lv-peers-dark",
                  )}
                >
                  <Icon className="h-[22px] w-[22px]" />
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.06em]">{book ? "Book" : "Read"}</span>
                </span>
                <div className="min-w-0">
                  <p className={cn("text-xs font-semibold", book ? "text-lv-upwards-dark" : "text-lv-peers-dark")}>{book ? "Book" : "Article"}</p>
                  <h3 className="mt-1.5 font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">{r.title}</h3>
                  <p className="mt-1.5 text-xs font-medium text-muted">{r.author}</p>
                  {r.blurb && <p className="mt-2 line-clamp-2 text-sm leading-5 text-v2-body">{r.blurb}</p>}
                </div>
              </V2Card>
            );
          })}
        </div>
      )}

      {active === "articles" && (
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/articles/${a.id}`}
              className="group flex flex-col gap-5 rounded-[24px] bg-card p-4 shadow-v2-card transition-all duration-200 ease-out-expo hover:-translate-y-1 hover:shadow-v2-lift sm:flex-row sm:items-center"
            >
              <div className="relative h-[152px] w-full shrink-0 overflow-hidden rounded-2xl bg-surface-2 sm:w-[212px]">
                {a.coverUrl ? (
                  <Image src={a.coverUrl} alt="" fill sizes="212px" unoptimized={!canOptimize(a.coverUrl)} className="object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-muted">
                    <Newspaper className="h-8 w-8" />
                  </span>
                )}
              </div>
              <div className="min-w-0 pr-2">
                <p className="text-xs font-medium text-muted">
                  {timeAgo(a.createdAt)} &nbsp;·&nbsp; {a.authorName}
                </p>
                <h3 className="mt-2 font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">{a.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-5 text-v2-body">{articleExcerpt(a)}</p>
                <span className={v2Button("outline", "sm", "mt-3")}>
                  Read article <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
