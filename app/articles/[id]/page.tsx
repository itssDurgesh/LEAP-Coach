"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Newspaper } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { V2Card, V2_AVATAR, v2Button } from "@/components/v2/ui";
import { canOptimize } from "@/lib/images";
import { useApp } from "@/lib/store/AppProvider";
import { parseArticleBody } from "@/lib/types";

export default function ArticlePage() {
  return (
    <AppShell>
      <ArticleReader />
    </AppShell>
  );
}

const fmtDate = (iso: string, month: "short" | "long") =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month, year: "numeric" });

function ArticleReader() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { articles, users } = useApp();

  const published = articles.filter((a) => a.published && !a.archived);
  const article = published.find((a) => a.id === id);

  if (!article) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-[-0.015em] text-heading">Article not found</h1>
        <p className="mt-2 text-v2-body">It may have been unpublished or removed.</p>
        <Link href="/articles" className={v2Button("outline", "md", "mt-5")}>
          <ArrowLeft className="h-4 w-4" /> All articles
        </Link>
      </div>
    );
  }

  const author = users.find((u) => u.id === article.authorId);
  const blocks = parseArticleBody(article);
  const more = published
    .filter((a) => a.id !== article.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <Link
        href="/articles"
        className="group inline-flex items-center gap-2 text-sm font-semibold text-v2-body transition-colors duration-200 hover:text-heading"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:-translate-x-1" />
        All articles
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <V2Card className="space-y-[22px] p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full bg-v2-gold-soft px-3 py-1.5 text-xs font-semibold leading-[18px] text-v2-gold-text">Article</span>
            <span className="text-[13px] font-medium text-muted">{fmtDate(article.createdAt, "long")}</span>
          </div>

          <h1 className="text-balance font-heading text-[32px] font-bold leading-[1.15] tracking-[-0.015em] text-heading sm:text-[40px]">
            {article.title}
          </h1>

          <div className="flex items-center gap-3">
            <Avatar src={author?.avatarUrl} name={article.authorName} size={40} ring={false} className={V2_AVATAR} />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-5 text-heading">{article.authorName}</p>
              {author?.headline && <p className="truncate text-xs font-medium text-muted">{author.headline}</p>}
            </div>
          </div>

          {article.coverUrl && (
            <div className="relative h-[220px] w-full overflow-hidden rounded-[20px] sm:h-[380px]">
              <Image
                src={article.coverUrl}
                alt={article.title}
                fill
                sizes="(max-width: 1024px) 100vw, 792px"
                unoptimized={!canOptimize(article.coverUrl)}
                className="object-cover"
              />
            </div>
          )}

          {blocks.map((b, i) =>
            b.kind === "image" ? (
              <figure key={i}>
                {/* Body images are author-supplied with unknown intrinsic size, so
                    declare a nominal box and let CSS drive the real height. */}
                <Image
                  src={b.image.url}
                  alt={b.image.alt ?? ""}
                  width={1200}
                  height={800}
                  sizes="(max-width: 1024px) 100vw, 792px"
                  unoptimized={!canOptimize(b.image.url)}
                  className="rounded-[20px]"
                  style={{ width: "100%", height: "auto" }}
                />
                {b.image.alt && <figcaption className="mt-2 text-xs font-medium text-muted">{b.image.alt}</figcaption>}
              </figure>
            ) : (
              <p key={i} className="text-base leading-6 text-v2-body">
                {b.text}
              </p>
            ),
          )}
        </V2Card>

        {more.length > 0 && (
          <V2Card className="p-5">
            <h2 className="pb-2 font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">More articles</h2>
            <div className="space-y-1.5">
              {more.map((a) => (
                <Link
                  key={a.id}
                  href={`/articles/${a.id}`}
                  className="-mx-2 flex items-center gap-3.5 rounded-[14px] p-2 transition-colors duration-200 hover:bg-surface"
                >
                  <span className="relative h-[60px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {a.coverUrl ? (
                      <Image src={a.coverUrl} alt="" fill sizes="84px" unoptimized={!canOptimize(a.coverUrl)} className="object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-muted">
                        <Newspaper className="h-5 w-5" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-semibold leading-5 text-heading">{a.title}</span>
                    <span className="mt-0.5 block text-xs font-medium text-muted">{fmtDate(a.createdAt, "short")}</span>
                  </span>
                </Link>
              ))}
            </div>
            <Link href="/articles" className={v2Button("outline", "sm", "mt-3")}>
              All articles <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </V2Card>
        )}
      </div>
    </div>
  );
}
