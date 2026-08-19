"use client";

import Image from "next/image";
import { BookOpen, ExternalLink } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { canOptimize } from "@/lib/images";
import { useApp } from "@/lib/store/AppProvider";

export function HomeBooks() {
  const { books, siteContent } = useApp();
  const c = siteContent;
  const list = books.filter((b) => b.active).sort((a, b) => a.order - b.order);

  if (!list.length) return null;

  return (
    <section id="books" className="bg-surface py-16 sm:py-20">
      <Container width="wide">
        <Reveal className="max-w-2xl">
          <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
            Books
          </p>
          <h2 className="mt-4 text-balance font-heading text-display font-bold text-heading">
            {c.booksHeading}
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">{c.booksSubheading}</p>
        </Reveal>

        <Stagger className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" gap={0.09}>
          {list.map((b) => (
            <StaggerItem key={b.id}>
              <article className="group flex gap-6">
                {/* Cover standing on its edge, with a cast shadow — a book, not a card. */}
                <div className="relative h-40 w-[6.5rem] shrink-0 overflow-hidden rounded-l-sm rounded-r-lg shadow-lift transition-transform duration-500 ease-out-expo group-hover:-translate-y-1.5">
                  {b.coverUrl ? (
                    <Image
                      src={b.coverUrl}
                      alt={b.title}
                      fill
                      sizes="104px"
                      unoptimized={!canOptimize(b.coverUrl)}
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-navy-700 to-navy-900 p-2 text-center">
                      <BookOpen className="h-7 w-7 text-gold-400" />
                    </div>
                  )}
                  {/* Spine highlight */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent"
                  />
                </div>

                <div className="flex min-w-0 flex-col">
                  <h3 className="font-heading text-base font-bold leading-snug text-heading">
                    {b.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-gold-700">
                    {b.author}
                  </p>
                  <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted">{b.blurb}</p>
                  {b.link && (
                    <a
                      href={b.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center gap-1.5 pt-4 font-heading text-sm font-semibold text-gold-700 transition-colors duration-200 hover:text-gold-600"
                    >
                      Learn more <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
