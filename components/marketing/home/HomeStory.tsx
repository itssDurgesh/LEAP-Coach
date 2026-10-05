"use client";

import * as React from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { ArrowUpRight, Award, Briefcase, Check, GraduationCap, Lightbulb, Play, Rocket, X, type LucideIcon } from "lucide-react";
import { HeroMedia } from "@/components/HeroMedia";
import { Container } from "@/components/marketing/Container";
import { Typewriter } from "@/components/marketing/Typewriter";
import { LogoMark } from "@/components/ui/Logo";
import { v2Button } from "@/components/v2/button";
import { ROLES, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  {
    tag: "Learn with AI",
    title: "Learn with AI",
    text: "Watch the professor's video lessons with a personal AI tutor and class notes beside every video.",
  },
  {
    tag: "Choose your path",
    title: "Built for who you are right now",
    text: "Your dashboard, catalog, and recommendations adapt to your path from the moment you join.",
  },
  {
    tag: "Prove it & level up",
    title: "Prove it & level up",
    text: "Pass AI-graded checkpoints, earn credits, and unlock the next stage.",
  },
];

// Scroll progress (0 to 1) at which each scene fades in and out. One scene is fully
// gone before the next begins, so two never show through each other.
// Every range runs the full 0 to 1: the browser drives these fades from the scroll
// position itself, and a range that stops early is completed with the element's
// resting value, which makes a hidden scene fade back in further down the page.
const WINDOWS: [number[], number[]][] = [
  [[0, 0.3, 0.335, 1], [1, 1, 0, 0]],
  [[0, 0.345, 0.38, 0.63, 0.665, 1], [0, 0, 1, 1, 0, 0]],
  [[0, 0.675, 0.71, 1], [0, 0, 1, 1]],
];

function StepText({ index, className }: { index: number; className?: string }) {
  const s = STEPS[index];
  return (
    <div className={className}>
      <span className="rounded-full bg-v2-gold-soft px-3 py-1.5 text-xs font-semibold text-v2-gold-text">
        0{index + 1} &nbsp;{s.tag}
      </span>
      <h2 className="mt-4 text-balance font-heading text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-heading xl:text-[40px] xl:leading-[1.1]">{s.title}</h2>
      <p className="mt-3 text-[15px] leading-6 text-v2-body xl:mt-4 xl:text-base">{s.text}</p>
    </div>
  );
}

/**
 * "How it works" as a story. On wide screens the stage holds still while scrolling
 * walks through three scenes of the product; on smaller screens, and for visitors
 * who ask for reduced motion, the same three scenes are simply stacked.
 */
export function HomeStory() {
  // Read after mount, so the server and the first client render agree.
  const [still, setStill] = React.useState(false);
  React.useEffect(() => setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);

  return (
    <div className="relative">
      {/* Landing spot of the "How it works" links. On wide screens it sits one menu
          bar below the top, so the link lands exactly where the stage starts to hold. */}
      <span id="how" aria-hidden className={cn("absolute left-0 top-0", !still && "xl:top-[88px]")} />

      {!still && <PinnedStory />}

      <section className={cn("py-16 sm:py-20", !still && "xl:hidden")}>
        <Container width="wide" className="space-y-16">
          {STEPS.map((s, i) => (
            <div key={s.tag} className="grid items-center gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-14">
              <StepText index={i} />
              {[<LessonScene key="l" />, <PathsScene key="p" />, <CheckpointScene key="c" />][i]}
            </div>
          ))}
        </Container>
      </section>
    </div>
  );
}

function PinnedStory() {
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = React.useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(v < 0.34 ? 0 : v < 0.67 ? 1 : 2));

  const scenes = [
    <LessonScene key="lesson" progress={scrollYProgress} />,
    <PathsScene key="paths" progress={scrollYProgress} />,
    <CheckpointScene key="check" progress={scrollYProgress} />,
  ];

  return (
    // Tall on purpose: each scene takes about two screens of scrolling, so a quick
    // flick does not skip one.
    <section ref={ref} className="relative hidden h-[740vh] xl:block">
      {/* The top padding keeps the stage clear of the floating menu bar. */}
      <div className="sticky top-0 flex h-screen items-center overflow-hidden pt-[72px]">
        <motion.span aria-hidden style={{ scaleX: scrollYProgress }} className="absolute inset-x-0 top-0 h-1 origin-left bg-[#E9B93E]" />
        <Container width="wide" className="grid grid-cols-[360px_minmax(0,1fr)] items-center gap-14">
          <div>
            <div aria-hidden className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <span key={s.tag} className={cn("h-1.5 rounded-full transition-all duration-500", i === active ? "w-10 bg-[#E9B93E]" : "w-4 bg-surface-2")} />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="mt-6"
              >
                <StepText index={active} />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="relative h-[min(540px,calc(100vh-96px))]">
            {scenes.map((scene, i) => (
              <SceneLayer key={i} progress={scrollYProgress} window={WINDOWS[i]} interactive={i === active}>
                {scene}
              </SceneLayer>
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
}

function SceneLayer({
  progress,
  window: [input, output],
  interactive,
  children,
}: {
  progress: MotionValue<number>;
  window: [number[], number[]];
  interactive: boolean;
  children: React.ReactNode;
}) {
  const opacity = useTransform(progress, input, output);
  return (
    <motion.div style={{ opacity }} className={cn("absolute inset-0 flex items-center", !interactive && "pointer-events-none")}>
      <div className="w-full">{children}</div>
    </motion.div>
  );
}

/**
 * Pops its children in (fade, rise, slight grow) once the scroll reaches `at`.
 * Without `progress` (the stacked layout) it is a plain wrapper.
 */
function Pop({ progress, at, className, children }: { progress?: MotionValue<number>; at: number; className?: string; children: React.ReactNode }) {
  const fixed = useMotionValue(1);
  const p = progress ?? fixed;
  const stops = [0, at, at + 0.035, 1];
  const opacity = useTransform(p, stops, progress ? [0, 0, 1, 1] : [1, 1, 1, 1]);
  const y = useTransform(p, stops, progress ? [30, 30, 0, 0] : [0, 0, 0, 0]);
  const scale = useTransform(p, stops, progress ? [0.93, 0.93, 1, 1] : [1, 1, 1, 1]);
  return (
    <motion.div style={{ opacity, y, scale }} className={className}>
      {children}
    </motion.div>
  );
}

const CARD = "rounded-[24px] bg-card shadow-v2-card";

/** Scene 1: the video settles into the lesson player and the tutor arrives beside it. A picture of the product, so it is hidden from screen readers. */
function LessonScene({ progress }: { progress?: MotionValue<number> }) {
  // Once the tutor has spoken it stays: scrolling back up does not retype it.
  const [tutorOn, setTutorOn] = React.useState(!progress);
  const fixed = useMotionValue(1);
  const p = progress ?? fixed;
  const scale = useTransform(p, [0, 0.12, 1], progress ? [1.2, 1, 1] : [1, 1, 1]);
  const x = useTransform(p, [0, 0.12, 1], progress ? ["20%", "0%", "0%"] : ["0%", "0%", "0%"]);
  useMotionValueEvent(p, "change", (v) => {
    if (progress && v > 0.135) setTutorOn(true);
  });

  return (
    <div aria-hidden className="grid items-center gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <motion.div style={{ scale, x, transformOrigin: "left center" }} className="relative aspect-video overflow-hidden rounded-[24px] bg-v2-navy shadow-v2-card">
        <HeroMedia className="absolute inset-0 h-full w-full" />
        <span className="absolute left-4 top-4 flex flex-wrap items-center gap-2.5 text-white">
          <span className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold">Leading Self · Lesson 3</span>
          <span className="text-[13px] font-medium text-white/85">Values under pressure</span>
        </span>
      </motion.div>
      <Pop progress={progress} at={0.09} className={cn(CARD, "space-y-3.5 p-5")}>
        <div className="flex items-center gap-3">
          <LogoMark className="h-10 w-10" />
          <div>
            <p className="font-heading text-lg font-semibold leading-[23px] text-heading">LEAP AI Tutor</p>
            <p className="text-xs font-medium text-muted">Grounded strictly in this lesson</p>
          </div>
        </div>
        <div className="flex justify-end">
          <p className="max-w-[88%] rounded-2xl bg-v2-strong px-3.5 py-2.5 text-sm leading-5 text-v2-on-strong">
            {tutorOn && progress ? <Typewriter text="Summarise this lesson in three points" speed={28} startDelay={200} /> : "Summarise this lesson in three points"}
          </p>
        </div>
        <motion.ol
          initial={false}
          animate={{ opacity: tutorOn ? 1 : 0, y: tutorOn ? 0 : 8 }}
          transition={{ duration: 0.5, ease: EASE, delay: tutorOn && progress ? 1.5 : 0 }}
          className="max-w-[94%] space-y-1 rounded-2xl bg-surface px-3.5 py-2.5 text-sm leading-5 text-heading"
        >
          <li>1 · Lead from values, not from fear of judgement.</li>
          <li>2 · Name the behaviour, never the person.</li>
          <li>3 · Close the loop within 48 hours.</li>
        </motion.ol>
        <div className="flex flex-wrap gap-2">
          {["Summarize", "Quiz me", "Go deeper"].map((label) => (
            <span key={label} className="rounded-full border border-v2-line-strong px-3 py-1.5 text-xs font-semibold text-heading">
              {label}
            </span>
          ))}
        </div>
      </Pop>
    </div>
  );
}

const PATH_LOOK: Record<Role, { icon: LucideIcon; tint: string; base: string }> = {
  student: { icon: GraduationCap, tint: "bg-lv-self-tint", base: "bg-lv-self" },
  professional: { icon: Briefcase, tint: "bg-lv-people-tint", base: "bg-lv-people" },
  entrepreneur: { icon: Rocket, tint: "bg-lv-peers-tint", base: "bg-lv-peers" },
};

/** Scene 2: the dashboard's continue card (a picture) over the three learning paths (real links to sign up). */
function PathsScene({ progress }: { progress?: MotionValue<number> }) {
  return (
    <div className="space-y-5">
      <Pop progress={progress} at={0.345} className="relative overflow-hidden rounded-[24px] bg-v2-navy p-6 shadow-v2-card">
        <div aria-hidden>
          <span className="absolute -right-24 -top-32 h-56 w-56 rounded-full bg-gold-400/20" />
          <p className="text-[13px] font-medium text-v2-on-navy-muted">Continue where you stopped</p>
          <p className="mt-2 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.015em] text-white sm:text-[26px]">Leading Self: The Foundation of Leadership</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-v2-navy-raised">
              <span className="block h-full w-1/2 rounded-full bg-gold-400" />
            </span>
            <span className="text-[13px] font-semibold text-white">4 of 8 videos</span>
          </div>
          <span className={v2Button("primary", "md", "mt-5")}>
            <Play className="h-4 w-4 fill-current" /> Resume video
          </span>
        </div>
      </Pop>
      <div className="grid gap-5 sm:grid-cols-3">
        {ROLES.map((role, i) => {
          const look = PATH_LOOK[role.id];
          return (
            <Pop key={role.id} progress={progress} at={0.385 + i * 0.03}>
              <Link href="/signup" className={cn("group block h-full rounded-[20px] p-5 transition-transform duration-300 ease-out-expo hover:-translate-y-1", look.tint)}>
                <span className="flex items-start justify-between">
                  <span className={cn("grid h-11 w-11 place-items-center rounded-full text-white", look.base)}>
                    <look.icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-heading opacity-0 transition-opacity duration-200 group-hover:opacity-100" strokeWidth={2.25} />
                </span>
                <span className="mt-4 block font-heading text-lg font-semibold leading-[23px] text-heading">For {role.label}s</span>
                <span className="mt-1 block text-xs font-medium leading-[18px] text-v2-body">{role.tagline}</span>
              </Link>
            </Pop>
          );
        })}
      </div>
    </div>
  );
}

const OPTION = "flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3 text-sm leading-5 text-heading";

/** Scene 3: a checkpoint question on its second try, the tutor's hint, and the credits it earns. A picture of the product. */
function CheckpointScene({ progress }: { progress?: MotionValue<number> }) {
  return (
    // The top margin (stacked layout) leaves room for the badge that hangs over the card's edge.
    <div aria-hidden className="relative mt-4 xl:mt-0">
      <Pop progress={progress} at={0.675} className={cn(CARD, "space-y-4 p-6")}>
        <div className="flex gap-2">
          <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-v2-body">Question 2</span>
          <span className="rounded-full bg-v2-gold-soft px-3 py-1.5 text-xs font-semibold text-v2-gold-text">Try 2 of 4</span>
        </div>
        <p className="font-heading text-lg font-semibold leading-[23px] text-heading">What actually makes feedback land?</p>
        <div className="space-y-2">
          <p className={cn(OPTION, "border-lv-people bg-lv-people-tint font-semibold")}>
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lv-people text-white">
              <X className="h-3 w-3" strokeWidth={3.5} />
            </span>
            <span className="flex-1 text-muted">Saying it as soon as you feel it</span>
            <span className="text-xs font-semibold text-lv-people-dark">Tried</span>
          </p>
          <p className={cn(OPTION, "border-lv-orgs bg-lv-orgs-tint font-semibold ring-1 ring-lv-orgs")}>
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lv-orgs text-white">
              <Check className="h-3 w-3" strokeWidth={3.5} />
            </span>
            Specificity and timing
          </p>
          <p className={cn(OPTION, "border-v2-line-strong font-medium")}>
            <span className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-v2-line-strong" />
            Keeping it general, to be kind
          </p>
        </div>
        <Pop progress={progress} at={0.745} className="flex items-center gap-3 rounded-[14px] bg-v2-gold-soft p-3.5">
          <LogoMark className="h-8 w-8" />
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-v2-gold-text">
              <Lightbulb className="h-3.5 w-3.5" /> Hint from your LEAP tutor
            </p>
            <p className="text-sm font-medium leading-5 text-heading">Feedback tied to an observable behaviour lands; feedback aimed at identity gets defended against.</p>
          </div>
        </Pop>
      </Pop>
      <Pop progress={progress} at={0.8} className="absolute -top-5 right-2 flex items-center gap-2 rounded-full bg-v2-strong px-4 py-2.5 text-[13px] font-semibold text-v2-on-strong shadow-v2-lift xl:-right-3">
        <Award className="h-4 w-4 text-gold-400" /> Checkpoint passed · credits earned
      </Pop>
    </div>
  );
}
