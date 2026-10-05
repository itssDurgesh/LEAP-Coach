"use client";

import Image from "next/image";
import { BookOpen, ExternalLink } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { CARD, SectionHead } from "@/components/marketing/SectionHead";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { canOptimize } from "@/lib/images";
import { useApp } from "@/lib/store/AppProvider";
import { cn } from "@/lib/utils";

export function HomeBooks() {
  const { books, siteContent } = useApp();
  const c = siteContent;
  const list = books.filter((b) => b.active).sort((a, b) => a.order - b.order);

  if (!list.length) return null;

  return (
    <section id="books" className="py-16 sm:py-20">
      <Container width="wide">
        <Reveal>
          <SectionHead tag="Books" title={c.booksHeading} text={c.booksSubheading} />
        </Reveal>

        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" gap={0.09}>
          {list.map((b) => (
            <StaggerItem key={b.id}>
              <article className={cn(CARD, "group flex h-full gap-5 p-5")}>
                {/* Cover standing on its edge, with a cast shadow — a book, not a card. */}
                <div className="relative h-40 w-[6.5rem] shrink-0 overflow-hidden rounded-l-sm rounded-r-lg shadow-v2-lift transition-transform duration-500 ease-out-expo group-hover:-translate-y-1.5">
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
                  <h3 className="font-heading text-lg font-semibold leading-[23px] tracking-[-0.01em] text-heading">
                    {b.title}
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold text-v2-gold-text">{b.author}</p>
                  <p className="mt-3 line-clamp-4 text-sm leading-5 text-v2-body">{b.blurb}</p>
                  {b.link && (
                    <a
                      href={b.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-v2-gold-text hover:underline"
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
