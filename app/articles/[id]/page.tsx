"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/button-variants";
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

function ArticleReader() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { articles, users } = useApp();

  const article = articles.find((a) => a.id === id && a.published && !a.archived);

  if (!article) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-heading">Article not found</h1>
        <p className="mt-2 text-muted">It may have been unpublished or removed.</p>
        <Link href="/articles" className={buttonClasses({ variant: "outline", size: "md", className: "mt-5" })}>
          <ArrowLeft className="h-4 w-4" /> All articles
        </Link>
      </div>
    );
  }

  const author = users.find((u) => u.id === article.authorId);
  const blocks = parseArticleBody(article);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/articles"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-heading"
      >
        <ArrowLeft className="h-4 w-4" /> All articles
      </Link>

      <Card className="overflow-hidden">
        {article.coverUrl && (
          <div className="relative h-56 w-full">
            <Image
              src={article.coverUrl}
              alt={article.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              unoptimized={!canOptimize(article.coverUrl)}
              className="object-cover"
            />
          </div>
        )}
        <div className="p-6 sm:p-8">
          <h1 className="font-heading text-3xl font-bold leading-tight text-heading">{article.title}</h1>

          <div className="mt-4 flex items-center gap-3 border-b border-hair pb-5">
            <Avatar src={author?.avatarUrl} name={article.authorName} size={40} />
            <div>
              <p className="text-sm font-semibold text-heading">{article.authorName}</p>
              <p className="inline-flex items-center gap-1 text-xs text-faint">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(article.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {blocks.map((b, i) =>
              b.kind === "image" ? (
                <figure key={i} className="my-2">
                  {/* Body images are author-supplied with unknown intrinsic size, so
                      declare a nominal box and let CSS drive the real height. */}
                  <Image
                    src={b.image.url}
                    alt={b.image.alt ?? ""}
                    width={1200}
                    height={800}
                    sizes="(max-width: 768px) 100vw, 768px"
                    unoptimized={!canOptimize(b.image.url)}
                    className="rounded-xl"
                    style={{ width: "100%", height: "auto" }}
                  />
                  {b.image.alt && (
                    <figcaption className="mt-2 text-center text-xs text-faint">{b.image.alt}</figcaption>
                  )}
                </figure>
              ) : (
                <p key={i} className="leading-relaxed text-heading/90">
                  {b.text}
                </p>
              ),
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
