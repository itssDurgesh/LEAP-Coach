"use client";

import * as React from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { CourseThumb } from "@/components/CourseThumb";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/lib/store/AppProvider";
import { formatINR } from "@/lib/utils";
import type { Course } from "@/lib/types";

/** Same ordering as before — trending first, then rating — just showing more of it. */
const pickFeatured = (courses: Course[]): Course[] =>
  [...courses]
    .filter((c) => c.published)
    .sort((a, b) => Number(b.trending) - Number(a.trending) || b.rating - a.rating)
    .slice(0, 9);

function CourseCardLink({ course }: { course: Course }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-hair bg-card shadow-card transition-all duration-300 ease-out-expo hover:-translate-y-1.5 hover:border-gold-300 hover:shadow-lift"
    >
      <div className="relative overflow-hidden">
        <CourseThumb
          accent={course.accent}
          category={course.category}
          src={course.thumbnailUrl}
          rounded="rounded-none"
          className="aspect-[16/10] transition-transform duration-500 ease-out-expo group-hover:scale-[1.04]"
        />
        {course.trending && (
          <span className="absolute right-3 top-3">
            <Badge variant="trending">Trending</Badge>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-faint">
          <Avatar name={course.instructorName} size={22} />
          {course.instructorName}
        </div>
        <h3 className="mt-3 font-heading text-lg font-bold leading-snug text-heading transition-colors duration-200 group-hover:text-gold-700">
          {course.title}
        </h3>
        <div className="mt-auto flex items-center justify-between border-t border-hair pt-4 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-heading">
            <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
            {course.rating.toFixed(1)}
          </span>
          <span className="font-heading text-base font-bold text-heading">
            {course.price === 0 ? "Free" : formatINR(course.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedCourses() {
  const { courses } = useApp();
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

  if (!featured.length) {
    return (
      <p className="mt-10 rounded-3xl border border-dashed border-hair bg-card/40 px-6 py-14 text-center text-sm text-muted">
        New coaching topics are on the way. Check back soon.
      </p>
    );
  }

  // Below four topics a carousel is pointless — fall back to a plain grid.
  if (featured.length < 4) {
    return (
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {featured.map((c) => (
          <CourseCardLink key={c.id} course={c} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-10">
      {/* The track bleeds past the container on the right so the row reads as
          continuing off-screen rather than as a boxed-in grid. */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-5 flex touch-pan-y">
          {featured.map((c) => (
            <div
              key={c.id}
              className="min-w-0 shrink-0 grow-0 basis-[85%] pl-5 sm:basis-[55%] lg:basis-[38%] xl:basis-[31%]"
            >
              <CourseCardLink course={c} />
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
          className="grid h-11 w-11 place-items-center rounded-full border border-hair text-heading transition-all duration-200 hover:border-gold-500 hover:bg-gold-500 hover:text-navy-900 disabled:pointer-events-none disabled:opacity-35"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canNext}
          aria-label="More topics"
          className="grid h-11 w-11 place-items-center rounded-full border border-hair text-heading transition-all duration-200 hover:border-gold-500 hover:bg-gold-500 hover:text-navy-900 disabled:pointer-events-none disabled:opacity-35"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
