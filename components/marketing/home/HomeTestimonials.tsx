"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { CARD, ROUND_BUTTON, SectionHead } from "@/components/marketing/SectionHead";
import { Reveal } from "@/components/motion/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { V2_AVATAR } from "@/components/v2/ui";
import { cn } from "@/lib/utils";
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
    <section className="py-16 sm:py-20">
      <Container width="wide">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead tag="In their words" title="What learners take away" />

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canPrev}
              aria-label="Previous testimonial"
              className={ROUND_BUTTON}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canNext}
              aria-label="Next testimonial"
              className={ROUND_BUTTON}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>

        <div className="-mx-5 -mb-8 mt-4 overflow-hidden px-5 py-8" ref={emblaRef}>
          <div className="-ml-5 flex touch-pan-y">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={`${t.name}-${i}`}
                className="min-w-0 shrink-0 grow-0 basis-[88%] pl-5 sm:basis-[58%] lg:basis-[40%]"
              >
                <figure className={cn(CARD, "flex h-full flex-col p-7 sm:p-8")}>
                  <blockquote className="flex-1 text-pretty text-base leading-7 text-heading">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-7 flex items-center gap-3.5">
                    <Avatar src={t.photoUrl} name={t.name} size={42} className={V2_AVATAR} />
                    <div className="min-w-0">
                      <p className="truncate font-heading text-[15px] font-semibold text-heading">{t.name}</p>
                      <p className="truncate text-xs font-medium text-muted">{t.role}</p>
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
