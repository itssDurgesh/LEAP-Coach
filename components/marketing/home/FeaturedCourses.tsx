"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ROUND_BUTTON } from "@/components/marketing/SectionHead";
import { TopicCard } from "@/components/v2/TopicCard";
import { useApp } from "@/lib/store/AppProvider";
import type { Course } from "@/lib/types";

/** Same ordering as before — trending first, then rating — just showing more of it. */
const pickFeatured = (courses: Course[]): Course[] =>
  [...courses]
    .filter((c) => c.published)
    .sort((a, b) => Number(b.trending) - Number(a.trending) || b.rating - a.rating)
    .slice(0, 9);

export function FeaturedCourses() {
  const { courses, tracks, hydrated } = useApp();
  const featured = pickFeatured(courses);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    loop: false,
  });
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  React.useEffect(() => {
    if (!emblaApi) return;
    const sync = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    sync();
    emblaApi.on("select", sync).on("reInit", sync);
    return () => {
      emblaApi.off("select", sync).off("reInit", sync);
    };
  }, [emblaApi]);

  // Courses live in the client store, so this renders the empty state first and then
  // swaps in a full carousel row — a several-hundred-pixel reflow that CLS counts.
  // Hold the row's height with a skeleton until the store is ready.
  if (!hydrated) {
    return (
      <div className="mt-10 overflow-hidden" aria-hidden>
        <div className="-ml-5 flex">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="min-w-0 shrink-0 grow-0 basis-[85%] pl-5 sm:basis-[55%] lg:basis-[38%] xl:basis-[31%]"
            >
              <div className="h-[22rem] w-full animate-pulse rounded-[24px] bg-surface-2" />
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-center gap-2.5">
          <div className="h-11 w-11 animate-pulse rounded-full bg-surface-2" />
          <div className="h-11 w-11 animate-pulse rounded-full bg-surface-2" />
        </div>
      </div>
    );
  }

  if (!featured.length) {
    return (
      <p className="mt-10 rounded-[24px] bg-card px-6 py-14 text-center text-sm text-v2-body shadow-v2-card">
        New coaching topics are on the way. Check back soon.
      </p>
    );
  }

  // Below four topics a carousel is pointless — fall back to a plain grid.
  if (featured.length < 4) {
    return (
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {featured.map((c) => (
          <TopicCard key={c.id} course={c} tracks={tracks} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-10">
      {/* The track bleeds past the container on the right so the row reads as
          continuing off-screen rather than as a boxed-in grid. */}
      <div className="-mx-5 -my-8 overflow-hidden px-5 py-8" ref={emblaRef}>
        <div className="-ml-5 flex touch-pan-y">
          {featured.map((c) => (
            <div
              key={c.id}
              className="flex min-w-0 shrink-0 grow-0 basis-[85%] pl-5 sm:basis-[55%] lg:basis-[38%] xl:basis-[31%] [&>a]:w-full"
            >
              <TopicCard course={c} tracks={tracks} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canPrev}
          aria-label="Previous topics"
          className={ROUND_BUTTON}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canNext}
          aria-label="More topics"
          className={ROUND_BUTTON}
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
