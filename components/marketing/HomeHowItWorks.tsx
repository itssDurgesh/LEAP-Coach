"use client";

import * as React from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Bot, Clapperboard, ClipboardCheck, Layers, LucideIcon } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

const steps = [
  {
    n: "01",
    title: "Choose your path",
    body: "Tell us if you're a student, professional, or entrepreneur, and your catalog adapts.",
  },
  {
    n: "02",
    title: "Learn with AI",
    body: "Watch the professor's video lessons with a personal AI tutor and class notes beside every video.",
  },
  {
    n: "03",
    title: "Prove it & level up",
    body: "Pass AI-graded checkpoints, earn credits, and unlock the next stage.",
  },
];

const features: { icon: LucideIcon; title: string; body: string; span: string }[] = [
  {
    icon: Clapperboard,
    title: "High-Quality Video Lessons",
    body: "Evidence-based lessons recorded by the professor himself, in studio-quality video that streams instantly, anytime.",
    span: "lg:col-span-7",
  },
  {
    icon: Bot,
    title: "LEAP AI Tutor",
    body: "A context-aware AI tutor on every video, grounded strictly in that lesson. Ask it to summarize, quiz you, or go deeper.",
    span: "lg:col-span-5",
  },
  {
    icon: ClipboardCheck,
    title: "AI-Graded Assessments",
    body: "Checkpoints every two lessons, with instant personalized feedback on where to improve.",
    span: "lg:col-span-5",
  },
  {
    icon: Layers,
    title: "Structured Tracks",
    body: "Role-specific roadmaps spanning leading self, people, peers, cultures and organizations.",
    span: "lg:col-span-7",
  },
];

/**
 * The old page ran "features" and "how it works" as two consecutive centered-header
 * card grids. They're merged here into one section: a scroll-linked spine for the
 * three steps, then the four capabilities in an uneven bento so the grid stops
 * reading as a template.
 */
export function HomeHowItWorks() {
  const reduce = useReducedMotion();
  const spineRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: spineRef,
    offset: ["start 75%", "end 65%"],
  });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="how" className="bg-card py-20 sm:py-28">
      <Container width="wide">
        <Reveal className="max-w-2xl">
          <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
            How it works
          </p>
          <h2 className="mt-4 text-balance font-heading text-display font-bold text-heading">
            More than a video library
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
            A system that teaches, tutors, and tests — so what you learn actually holds up under
            pressure.
          </p>
        </Reveal>

        {/* ── Spine ── */}
        <div ref={spineRef} className="relative mt-16 pl-14 sm:pl-24">
          {/* Track + scroll-linked fill */}
          <div className="absolute left-[1.15rem] top-2 h-[calc(100%-1rem)] w-px bg-hair sm:left-[2.4rem]" aria-hidden />
          <motion.div
            aria-hidden
            style={reduce ? undefined : { scaleY }}
            className="absolute left-[1.15rem] top-2 h-[calc(100%-1rem)] w-px origin-top bg-gold-500 sm:left-[2.4rem]"
          />

          <div className="space-y-14 sm:space-y-20">
            {steps.map((s) => (
              <Reveal key={s.n} className="relative" amount={0.4}>
                {/* Outlined numeral hanging in the gutter */}
                <span
                  aria-hidden
                  className="absolute -left-14 top-0 font-heading text-numeral font-extrabold leading-none text-gold-500/25 sm:-left-24"
                >
                  {s.n}
                </span>
                <span className="absolute -left-[3.35rem] top-2 h-2.5 w-2.5 rounded-full bg-gold-500 ring-4 ring-card sm:-left-[5.05rem]" aria-hidden />

                <h3 className="font-heading text-xl font-bold text-heading sm:text-2xl">{s.title}</h3>
                <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
                  {s.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>

        {/* ── Capabilities bento ── */}
        <Stagger className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-12" gap={0.08}>
          {features.map((f) => (
            <StaggerItem key={f.title} className={f.span}>
              <div className="group h-full rounded-3xl border border-hair bg-surface p-7 transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:border-gold-300 hover:shadow-lift sm:p-8">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-navy-900 text-gold-400 transition-colors duration-300 group-hover:bg-gold-500 group-hover:text-navy-900 dark:bg-surface-2">
                  <f.icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <h3 className="mt-5 font-heading text-lg font-bold text-heading">{f.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
