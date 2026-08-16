"use client";

import { BookOpen, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useApp } from "@/lib/store/AppProvider";

export function HomeBooks() {
  const { books, siteContent } = useApp();
  const c = siteContent;
  const list = books
    .filter((b) => b.active)
    .sort((a, b) => a.order - b.order);

  if (!list.length) return null;

  return (
    <section id="books" className="bg-card">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="gold">Books</Badge>
          <h2 className="mt-4 font-heading text-3xl font-bold text-heading sm:text-4xl">{c.booksHeading}</h2>
          <p className="mt-3 text-muted">{c.booksSubheading}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <div
              key={b.id}
              className="flex gap-5 rounded-2xl border border-hair bg-surface p-5 transition-colors hover:border-gold-200"
            >
              {/* Cover */}
              <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-lg shadow-card">
                {b.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.coverUrl} alt={b.title} width={96} height={144} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-navy-700 to-navy-900 p-2 text-center">
                    <BookOpen className="h-7 w-7 text-gold-400" />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col">
                <h3 className="font-heading text-base font-semibold leading-snug text-heading">{b.title}</h3>
                <p className="mt-0.5 text-xs font-medium text-gold-700">{b.author}</p>
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted">{b.blurb}</p>
                {b.link && (
                  <a
                    href={b.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold text-gold-600 hover:text-gold-700"
                  >
                    Learn more <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
