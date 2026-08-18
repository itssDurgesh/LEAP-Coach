"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { Typewriter } from "@/components/marketing/Typewriter";
import { HeroProductMock } from "@/components/marketing/HeroProductMock";
import { PROFESSOR } from "@/lib/professor";
import { buttonClasses } from "@/components/ui/button-variants";
import { useApp } from "@/lib/store/AppProvider";
import { SiteContent } from "@/lib/types";

/** Split the hero title so the configured highlight phrases render in gold. */
function highlightTitle(title: string, highlights: string[]) {
  const phrases = highlights.filter(Boolean);
  if (!phrases.length) return <span className="text-white">{title}</span>;
  const escaped = phrases.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "g");
  return title.split(re).map((part, i) =>
    phrases.includes(part) ? (
      <span key={i} className="text-gradient-gold-hero">
        {part}
      </span>
    ) : (
      <span key={i} className="text-white">
        {part}
      </span>
    ),
  );
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function HomeHero({ initialContent }: { initialContent?: SiteContent | null }) {
  const { siteContent, hydrated } = useApp();
  const reduce = useReducedMotion();
  // Before the client store hydrates, use the server-fetched content (so SSR + first
  // render show the saved hero, no flash). After hydration, use the live store so an
  // admin's in-session edits reflect immediately.
  const c = (!hydrated && initialContent) ? initialContent : siteContent;

  // Entrance (on mount, not on scroll — this block is above the fold).
  const container = reduce
    ? undefined
    : { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };
  const item = reduce
    ? undefined
    : {
        hidden: { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
      };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-950 to-navy-950 dark:from-card dark:via-card dark:to-surface">
      {/* Structural texture instead of blurred corner blobs: hairline column rules
          plus a fine grain, both barely there. */}
      <div className="pointer-events-none absolute inset-0 texture-rules opacity-[0.07]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 texture-grain opacity-[0.15] mix-blend-overlay" aria-hidden />

      <Container width="wide" className="relative">
        <motion.div
          variants={container}
          initial={reduce ? false : "hidden"}
          animate="show"
          // items-start, not items-center: the mock + its pull quote makes the right
          // column much taller, and centering pushed the copy down into the middle of
          // the viewport, leaving a dead band under the nav.
          className="grid items-start gap-12 pb-14 pt-24 lg:grid-cols-12 lg:gap-10 lg:pb-20 lg:pt-32"
        >
          {/* ── Copy ── */}
          <div className="lg:col-span-6 xl:col-span-6">
            <motion.div variants={item} className="flex items-start gap-3.5">
              <span className="mt-3 h-px w-7 shrink-0 bg-gold-500 sm:mt-4" aria-hidden />
              <p className="font-heading text-sm font-semibold uppercase leading-relaxed tracking-[0.1em] text-cream-100/90 sm:text-base sm:leading-relaxed sm:tracking-[0.13em]">
                <span className="text-white">L·E·A·P</span>
                <span className="mx-2 text-gold-400" aria-hidden>
                  /
                </span>
                <Typewriter text={c.heroEyebrow} className="text-gold-400" speed={55} />
              </p>
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-5 text-balance font-heading text-display-lg font-extrabold hang-punctuation"
            >
              {highlightTitle(c.heroTitle, c.heroHighlights)}
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-xl text-base leading-relaxed text-cream-100/70 sm:text-lg"
            >
              {c.heroSubtitle}
            </motion.p>

            <motion.div
              variants={item}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <Link
                href="/signup"
                className={buttonClasses({
                  variant: "primary",
                  size: "lg",
                  className: "group w-full justify-center sm:w-auto",
                })}
              >
                Start Your Journey
                <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
              </Link>
              <Link
                href="/courses"
                className={buttonClasses({
                  variant: "outline",
                  size: "lg",
                  className:
                    "w-full justify-center border-white/25 bg-transparent text-white hover:border-white/40 hover:bg-white/10 sm:w-auto",
                })}
              >
                Explore Topics
              </Link>
            </motion.div>
          </div>

          {/* ── Product mock ── */}
          <motion.div
            variants={
              reduce
                ? undefined
                : {
                    hidden: { opacity: 0, y: 34, scale: 0.97 },
                    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.95, ease: EASE, delay: 0.2 } },
                  }
            }
            className="lg:col-span-6 xl:col-span-6"
          >
            <HeroProductMock professorName={c.professorName} professorTitle={c.professorTitle} />

            {/* Admin-editable pull quote, set as a caption under the mock. */}
            {c.heroQuote && (
              <figure className="mt-7 flex gap-3.5 pl-1">
                <span className="mt-1.5 h-auto w-px shrink-0 self-stretch bg-gold-500/60" aria-hidden />
                <blockquote className="text-pretty text-sm italic leading-relaxed text-cream-100/70">
                  &ldquo;{c.heroQuote}&rdquo;
                </blockquote>
              </figure>
            )}
          </motion.div>
        </motion.div>

        {/* ── Credentials rule ──
            The professor's real numbers, set as a ruled row rather than a strip of
            floating pills. */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="border-t border-white/10 py-8 sm:py-10"
        >
          <div className="grid grid-cols-2 gap-y-7 sm:grid-cols-4">
            {PROFESSOR.heroStats.map((s) => (
              <div
                key={s.label}
                // One uniform rule: every cell carries a left hairline except the
                // first of its row — 2 per row on mobile, 4 from sm up.
                className="border-l border-white/10 pl-5 sm:pl-6 [&:nth-child(2n+1)]:border-l-0 [&:nth-child(2n+1)]:pl-0 sm:[&:nth-child(2n+1)]:border-l sm:[&:nth-child(2n+1)]:pl-6 sm:[&:nth-child(4n+1)]:border-l-0 sm:[&:nth-child(4n+1)]:pl-0"
              >
                <p className="font-heading text-2xl font-bold leading-none text-white sm:text-3xl">
                  {s.value}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-cream-100/50">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
