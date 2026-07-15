"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";
import { Typewriter } from "@/components/marketing/Typewriter";
import { HeroMedia } from "@/components/HeroMedia";
import { ProfessorPhoto } from "@/components/ProfessorPhoto";
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
      <span key={i} className="text-gradient-gold">
        {part}
      </span>
    ) : (
      <span key={i} className="text-white">
        {part}
      </span>
    ),
  );
}

export function HomeHero({ initialContent }: { initialContent?: SiteContent | null }) {
  const { siteContent, hydrated } = useApp();
  // Before the client store hydrates, use the server-fetched content (so SSR + first
  // render show the saved hero, no flash). After hydration, use the live store so an
  // admin's in-session edits reflect immediately.
  const c = (!hydrated && initialContent) ? initialContent : siteContent;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-900 to-navy-950 dark:from-card dark:via-card dark:to-surface">
      <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-44 h-80 w-80 rounded-full bg-navy-600/40 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-9 px-5 pb-12 pt-20 sm:gap-12 sm:px-8 sm:pb-16 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-28">
        <div>
          <p className="font-heading text-[11px] font-semibold uppercase leading-relaxed tracking-[0.12em] sm:text-base sm:tracking-[0.16em]">
            <span className="text-cream-100/90">L·E·A·P</span>
            <span className="mx-1.5 text-gold-400 sm:mx-2">—</span>
            <Typewriter text={c.heroEyebrow} className="text-gold-500" speed={65} />
          </p>
          <h1 className="mt-3 font-heading text-[1.9rem] font-extrabold leading-[1.1] text-balance sm:mt-4 sm:text-5xl sm:leading-[1.08] lg:text-[3.4rem]">
            {highlightTitle(c.heroTitle, c.heroHighlights)}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-cream-100/75 sm:mt-5 sm:text-lg">{c.heroSubtitle}</p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/signup"
              className={buttonClasses({ variant: "primary", size: "lg", className: "w-full justify-center sm:w-auto" })}
            >
              Start Your Journey <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/courses"
              className={buttonClasses({
                variant: "outline",
                size: "lg",
                className: "w-full justify-center border-white/30 bg-transparent text-white hover:bg-card/10 sm:w-auto",
              })}
            >
              Explore Topics
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 sm:mt-7 sm:gap-2.5">
            {PROFESSOR.heroStats.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-baseline gap-1.5 rounded-full border border-hair bg-[#ffffff] px-2.5 py-1 shadow-sm sm:px-3 sm:py-1.5"
              >
                <span className="font-heading text-sm font-bold text-navy-900">{s.value}</span>
                <span className="text-xs text-navy-600">{s.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Professor / video card */}
        <div className="relative">
          <div
            className="absolute -right-2 bottom-14 z-10 hidden animate-float rounded-2xl bg-[#ffffff] p-3 shadow-card sm:flex"
            style={{ animationDelay: "1.6s" }}
          >
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-50 text-navy-900">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="font-heading text-sm font-bold text-navy-900">LEAP AI</p>
                <p className="text-xs text-navy-500">Tutor on every lesson</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-700 to-navy-900 dark:from-surface-2 dark:to-card p-7 shadow-navy ring-1 ring-white/10">
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gold-500/20 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <ProfessorPhoto className="h-16 w-16 ring-4 ring-white/10" position="top" />
              <div>
                <p className="font-heading text-lg font-bold text-white">{c.professorName}</p>
                <p className="text-sm text-cream-100/70">{c.professorTitle}</p>
              </div>
            </div>

            <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 ring-1 ring-white/10">
              <HeroMedia className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-900/20 to-transparent" />
            </div>

            <p className="mt-5 text-pretty italic text-cream-100/90">&ldquo;{c.heroQuote}&rdquo;</p>
          </div>
        </div>
      </div>
    </section>
  );
}
