"use client";

import * as React from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ChevronDown, ClipboardCheck, Play } from "lucide-react";
import { HeroMedia } from "@/components/HeroMedia";
import { BRAND, Brand } from "@/components/marketing/Brand";
import { Container } from "@/components/marketing/Container";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Typewriter } from "@/components/marketing/Typewriter";
import { LogoMark } from "@/components/ui/Logo";
import { v2Button } from "@/components/v2/button";
import { PROFESSOR } from "@/lib/professor";
import { useApp } from "@/lib/store/AppProvider";
import { SiteContent } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

// The opening plays once per browser session: the first time the home page is seen
// in a tab. A refresh or the Back button loads the page afresh, so "seen" is kept
// in sessionStorage. `opening` holds the decision for this page load: it survives
// moving between pages inside the site, and it stays the same when React runs
// effects twice in development.
const INTRO_KEY = "leap-home-intro";
let opening: "undecided" | "play" | "skip" = "undecided";

/** Counts up to `text.length`, one character every `speed` ms, after `delay`. */
function useTyped(text: string, speed: number, delay: number, active: boolean) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    let i = 0;
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) clearInterval(interval);
      }, speed);
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [text, speed, delay, active]);
  return n;
}

/** The hero title, one word at a time, with the admin's highlight phrases in gold. */
function Headline({ title, highlights, show, instant }: { title: string; highlights: string[]; show: boolean; instant: boolean }) {
  const phrases = highlights.filter(Boolean);
  const parts = phrases.length
    ? title.split(new RegExp(`(${phrases.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g"))
    : [title];
  let index = 0;
  return (
    <>
      {parts.flatMap((part) =>
        part
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => {
            const i = index++;
            return (
              <React.Fragment key={i}>
                {/* Each word rises from behind its own baseline. */}
                <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
                  <motion.span
                    initial={false}
                    animate={{ y: show ? "0%" : "112%" }}
                    transition={{ duration: instant ? 0 : 0.75, ease: EASE, delay: show && !instant ? 0.1 + i * 0.055 : 0 }}
                    className={cn("inline-block", phrases.includes(part) && "text-v2-gold-text")}
                  >
                    {word}
                  </motion.span>
                </span>{" "}
              </React.Fragment>
            );
          }),
      )}
    </>
  );
}

/** "300K+" counts 0 to 300 and keeps the "K+". Without `count` the number is simply there. */
function Stat({ value, label, show, count }: { value: string; label: string; show: boolean; count: boolean }) {
  const m = value.match(/^(\D*)([\d.]+)(.*)$/);
  return (
    <div>
      <p className="font-heading text-2xl font-bold leading-7 tracking-[-0.015em] text-heading">
        {m ? <NumberFlow value={show ? Number(m[2]) : 0} prefix={m[1]} suffix={m[3]} animated={count} /> : value}
      </p>
      <p className="text-xs font-medium text-muted">{label}</p>
    </div>
  );
}

/**
 * Home page hero, with the menu bar, because the two move together in the opening:
 *   intro: "Welcome to", then the logo and "LEAP Coach" arrive in the brand colours.
 *   open:  the lockup glides up into the menu bar and the professor's video pops in.
 *   done:  headline, buttons and numbers are in.
 * The opening plays once per browser session. On every other load (refresh, Back,
 * a later visit to the page) the hero goes straight to "done" with no entrance.
 * The words are the admin-editable ones (Admin → Homepage).
 */
export function HomeHero({ initialContent }: { initialContent?: SiteContent | null }) {
  const { siteContent, hydrated } = useApp();
  const reduce = useReducedMotion();
  // Before the client store hydrates, use the server-fetched content (so SSR + first
  // render show the saved hero, no flash). After hydration, use the live store so an
  // admin's in-session edits reflect immediately.
  const c = !hydrated && initialContent ? initialContent : siteContent;

  const [phase, setPhase] = React.useState<"intro" | "open" | "done">(opening === "undecided" ? "intro" : "done");
  // Whether this visit plays the opening. When it does not, the hero is simply in
  // place: nothing glides, rises, types or counts.
  const [play, setPlay] = React.useState(opening === "undecided");
  const typed = useTyped(BRAND, 85, 750, phase === "intro");

  React.useEffect(() => {
    // `phase` here is the value from the first render: "intro" only the first time
    // the hero is shown after a page load.
    if (phase !== "intro") return;
    if (opening === "undecided") {
      let seen = false;
      try {
        seen = sessionStorage.getItem(INTRO_KEY) !== null;
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {
        // Storage can be blocked; the opening then plays on every page load.
      }
      // Also no opening for reduced motion, or when the link points at a section of the page.
      const skip = seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.location.hash !== "";
      opening = skip ? "skip" : "play";
    }
    if (opening === "skip") {
      setPlay(false);
      setPhase("done");
      return;
    }
    const t1 = setTimeout(() => setPhase("open"), 2700);
    const t2 = setTimeout(() => setPhase("done"), 3600);
    // Any scroll, tap or key press skips the opening.
    const skip = () => setPhase("done");
    const events = ["wheel", "touchstart", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, skip, { once: true, passive: true }));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      events.forEach((e) => window.removeEventListener(e, skip));
    };
    // The opening is started once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The hero drifts a little as it scrolls away. Ranges cover the whole 0 to 1,
  // because a range that stops early is completed with the element's resting value.
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const goldY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const tealY = useTransform(scrollYProgress, [0, 1], [0, 90]);

  const open = phase !== "intro";
  const done = phase === "done";
  const rise = (delay: number) => ({
    initial: false as const,
    animate: { opacity: done ? 1 : 0, y: done ? 0 : 18 },
    transition: play ? { duration: 0.7, ease: EASE, delay: done ? delay : 0 } : { duration: 0 },
  });
  // Small cards that settle beside the video and then float gently.
  const chip = (delay: number) => ({
    initial: false as const,
    animate: done ? { opacity: 1, scale: 1, y: reduce ? 0 : [0, -7, 0] } : { opacity: 0, scale: 0.8, y: 12 },
    transition: !done
      ? { duration: 0.2 }
      : play
        ? { opacity: { duration: 0.5, delay }, scale: { type: "spring" as const, stiffness: 220, damping: 16, delay }, y: { duration: 4.5, repeat: Infinity, ease: "easeInOut" as const, delay: delay + 0.6 } }
        : { opacity: { duration: 0 }, scale: { duration: 0 }, y: { duration: 4.5, repeat: Infinity, ease: "easeInOut" as const } },
  });

  return (
    <section ref={ref} className="relative flex min-h-screen flex-col pt-[72px]">
      {/* The menu bar is rendered here, not by the page, because it needs the opening's phase. */}
      <SiteNav overlay intro={play ? phase : undefined} />

      {phase === "intro" && (
        <div className="pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center gap-[2.2vw]">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="font-heading text-[clamp(20px,2.6vw,38px)] font-semibold leading-none tracking-[-0.01em] text-v2-body"
          >
            Welcome to
          </motion.p>
          {/* The same `layoutId` as the brand in the menu bar: this one glides into that one. */}
          <motion.div layoutId="brand" className="text-[clamp(40px,8.4vw,128px)]">
            <Brand typed={typed} intro />
          </motion.div>
        </div>
      )}

      <Container width="wide" className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-14">
        <div>
          <motion.p {...rise(0.02)} className="flex items-start gap-3 text-[13px] font-semibold uppercase leading-relaxed tracking-[0.12em] text-heading">
            <span aria-hidden className="mt-[0.7em] h-px w-7 shrink-0 bg-gold-500" />
            <span>
              L·E·A·P <span aria-hidden className="mx-1.5 text-gold-500">/</span>
              <span className="text-v2-gold-text">{done && play && !reduce ? <Typewriter text={c.heroEyebrow} speed={32} startDelay={350} /> : c.heroEyebrow}</span>
            </span>
          </motion.p>
          <h1 className="mt-4 font-heading text-[clamp(36px,4.4vw,60px)] font-bold leading-[1.08] tracking-[-0.02em] text-heading">
            <Headline title={c.heroTitle} highlights={c.heroHighlights} show={done} instant={!play} />
          </h1>
          <motion.p {...rise(0.5)} className="mt-5 max-w-xl text-base leading-6 text-v2-body sm:text-[17px] sm:leading-7">
            {c.heroSubtitle}
          </motion.p>
          <motion.div {...rise(0.62)} className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href="/signup" className={v2Button("primary", "md", "group")}>
              Start Your Journey <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
            </Link>
            <Link href="/courses" className={v2Button("outline")}>
              Explore Topics
            </Link>
          </motion.div>
        </div>

        <div className="relative">
          {/* The two circles wait for the video, so the opening has the screen to itself. */}
          <motion.span aria-hidden initial={false} animate={{ opacity: open ? 1 : 0 }} transition={{ duration: play ? 0.8 : 0 }} style={{ y: goldY }} className="absolute -right-6 -top-8 h-40 w-40 rounded-full bg-gold-400/25" />
          <motion.span aria-hidden initial={false} animate={{ opacity: open ? 1 : 0 }} transition={{ duration: play ? 0.8 : 0 }} style={{ y: tealY }} className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-lv-self/25" />
          <motion.div style={{ scale: videoScale }} className="relative">
            <motion.div
              initial={false}
              animate={{ scale: open ? 1 : 0.5, opacity: open ? 1 : 0 }}
              transition={play ? { type: "spring", stiffness: 170, damping: 18 } : { duration: 0 }}
              // 16:9, the clip's own shape, so nothing of the picture is cut off.
              className="relative aspect-video overflow-hidden rounded-[28px] bg-v2-navy shadow-v2-lift"
            >
              <HeroMedia className="absolute inset-0 h-full w-full" />
              <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0C1B36]/75 to-transparent" />
              <span className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-3 text-white">
                <span>
                  <span className="block font-heading text-lg font-semibold leading-6">{c.professorName}</span>
                  <span className="block text-[13px] font-medium text-white/75">{c.professorTitle}</span>
                </span>
                <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E9B93E] text-navy-800">
                  <Play className="h-4 w-4 fill-current" />
                </span>
              </span>
            </motion.div>

            <motion.div {...chip(0.75)} className="absolute -left-5 top-6 hidden items-center gap-2.5 rounded-2xl bg-card py-2.5 pl-2.5 pr-4 shadow-v2-lift sm:flex">
              <LogoMark className="h-9 w-9" />
              <span>
                <span className="block text-[13px] font-semibold leading-5 text-heading">LEAP AI Tutor</span>
                <span className="block text-xs font-medium text-muted">On every video</span>
              </span>
            </motion.div>
            <motion.div {...chip(0.95)} className="absolute -right-4 bottom-24 hidden items-center gap-2.5 rounded-2xl bg-card py-2.5 pl-2.5 pr-4 shadow-v2-lift sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-lv-orgs-tint text-lv-orgs-dark">
                <ClipboardCheck className="h-[18px] w-[18px]" />
              </span>
              <span>
                <span className="block text-[13px] font-semibold leading-5 text-heading">AI-Graded Assessments</span>
                <span className="block text-xs font-medium text-muted">Instant feedback</span>
              </span>
            </motion.div>
          </motion.div>

          {/* Admin-editable pull quote, set as a caption under the video. */}
          {c.heroQuote && (
            <motion.figure {...rise(0.85)} className="mt-6 flex gap-3.5 pl-1">
              <span aria-hidden className="w-[3px] shrink-0 self-stretch rounded-full bg-gold-400" />
              <blockquote className="text-pretty text-sm italic leading-6 text-v2-body">&ldquo;{c.heroQuote}&rdquo;</blockquote>
            </motion.figure>
          )}
        </div>
      </Container>

      {/* The professor's real numbers. */}
      <Container width="wide" className="pb-8">
        <motion.div {...rise(0.75)} className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            {PROFESSOR.heroStats.map((s) => (
              <Stat key={s.label} value={s.value} label={s.label} show={done} count={play} />
            ))}
          </div>
          <motion.span
            aria-hidden
            animate={reduce ? undefined : { y: [0, 5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="hidden items-center gap-1.5 text-[13px] font-semibold text-v2-body lg:flex"
          >
            Scroll to see inside <ChevronDown className="h-4 w-4" />
          </motion.span>
        </motion.div>
      </Container>
    </section>
  );
}
