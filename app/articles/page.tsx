"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { PageHead, V2Card, V2_AVATAR, v2Button } from "@/components/v2/ui";
import { canOptimize } from "@/lib/images";
import { useApp } from "@/lib/store/AppProvider";
import { articleExcerpt, type Article } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ArticlesPage() {
  return (
    <AppShell>
      <Articles />
    </AppShell>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const CARD = "group bg-card shadow-v2-card transition-all duration-200 ease-out-expo hover:-translate-y-1 hover:shadow-v2-lift";

/** The article's cover, or a plain placeholder when it has none. */
function Cover({ article, sizes, className }: { article: Article; sizes: string; className: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-surface-2", className)}>
      {article.coverUrl ? (
        <Image src={article.coverUrl} alt="" fill sizes={sizes} unoptimized={!canOptimize(article.coverUrl)} className="object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center text-muted">
          <Newspaper className="h-8 w-8" />
        </span>
      )}
    </div>
  );
}

function Articles() {
  const { articles, users } = useApp();
  const published = articles
    .filter((a) => a.published && !a.archived)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const [latest, ...more] = published;

  return (
    <div className="space-y-7">
      <PageHead
        title="Articles"
        description="Essays and insights from your mentors."
        actions={
          published.length > 0 && (
            <span className="rounded-full border border-hair bg-card px-3 py-1.5 text-xs font-semibold leading-[18px] text-v2-body">
              {published.length} {published.length === 1 ? "article" : "articles"}
            </span>
          )
        }
      />

      {!latest ? (
        <V2Card className="px-6 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
            <Newspaper className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-medium text-v2-body">No articles yet. Check back soon.</p>
        </V2Card>
      ) : (
        <>
          <Link href={`/articles/${latest.id}`} className={cn(CARD, "flex flex-col gap-6 rounded-[24px] p-4 lg:flex-row lg:items-center lg:gap-8")}>
            <Cover article={latest} sizes="(max-width: 1024px) 100vw, 560px" className="h-[220px] w-full rounded-2xl sm:h-[320px] lg:w-[560px]" />
            <div className="min-w-0 flex-1 space-y-3.5 px-2 pb-2 lg:px-0 lg:pb-0 lg:pr-6">
              <span className="inline-block rounded-full bg-[#E9B93E] px-3 py-1.5 text-xs font-semibold leading-[18px] text-navy-800">Latest</span>
              <h2 className="text-balance font-heading text-[32px] font-bold leading-[38px] tracking-[-0.015em] text-heading">{latest.title}</h2>
              <p className="line-clamp-3 text-[15px] leading-6 text-v2-body">{articleExcerpt(latest)}</p>
              <p className="flex items-center gap-2.5 text-[13px] font-medium text-muted">
                <Avatar src={users.find((u) => u.id === latest.authorId)?.avatarUrl} name={latest.authorName} size={28} ring={false} className={V2_AVATAR} />
                {latest.authorName} &nbsp;·&nbsp; {fmtDate(latest.createdAt)}
              </p>
              <div className="pt-1">
                <span className={v2Button("primary")}>
                  Read article <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>

          {more.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((a) => (
                <Link key={a.id} href={`/articles/${a.id}`} className={cn(CARD, "flex flex-col overflow-hidden rounded-[24px]")}>
                  <Cover article={a} sizes="(max-width: 640px) 100vw, 416px" className="h-[190px] w-full" />
                  <div className="flex flex-1 flex-col items-start gap-2 p-5">
                    <p className="text-xs font-medium text-muted">
                      {fmtDate(a.createdAt)} &nbsp;·&nbsp; {a.authorName}
                    </p>
                    <h2 className="line-clamp-2 font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">{a.title}</h2>
                    <p className="line-clamp-2 text-sm leading-5 text-v2-body">{articleExcerpt(a)}</p>
                    <span className={v2Button("outline", "sm", "mt-auto")}>
                      Read article <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
