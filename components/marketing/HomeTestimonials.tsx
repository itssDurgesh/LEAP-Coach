"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { Reveal } from "@/components/motion/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { TESTIMONIALS } from "@/lib/testimonials";

/**
 * Hidden entirely until real quotes are added to lib/testimonials.ts — same
 * self-hiding pattern as the mentors and books strips.
 */
export function HomeTestimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
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

  if (!TESTIMONIALS.length) return null;

  return (
    <section className="bg-surface py-16 sm:py-20">
      <Container width="wide">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
              In their words
            </p>
            <h2 className="mt-4 text-balance font-heading text-display font-bold text-heading">
              What learners take away
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canPrev}
              aria-label="Previous testimonial"
              className="grid h-11 w-11 place-items-center rounded-full border border-hair text-heading transition-all duration-200 hover:border-gold-500 hover:bg-gold-500 hover:text-navy-900 disabled:pointer-events-none disabled:opacity-35"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canNext}
              aria-label="Next testimonial"
              className="grid h-11 w-11 place-items-center rounded-full border border-hair text-heading transition-all duration-200 hover:border-gold-500 hover:bg-gold-500 hover:text-navy-900 disabled:pointer-events-none disabled:opacity-35"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>

        <div className="mt-12 overflow-hidden" ref={emblaRef}>
          <div className="-ml-5 flex touch-pan-y">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={`${t.name}-${i}`}
                className="min-w-0 shrink-0 grow-0 basis-[88%] pl-5 sm:basis-[58%] lg:basis-[40%]"
              >
                <figure className="flex h-full flex-col rounded-3xl border border-hair bg-card p-7 shadow-card sm:p-8">
                  <blockquote className="flex-1 text-pretty text-base leading-[1.7] text-heading">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-7 flex items-center gap-3.5 border-t border-hair pt-5">
                    <Avatar src={t.photoUrl} name={t.name} size={42} />
                    <div className="min-w-0">
                      <p className="truncate font-heading text-sm font-bold text-heading">{t.name}</p>
                      <p className="truncate text-xs text-muted">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
