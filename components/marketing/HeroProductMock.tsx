"use client";

import * as React from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { Bot, Check, Sparkles } from "lucide-react";
import { HeroMedia } from "@/components/HeroMedia";
import { ProfessorPhoto } from "@/components/ProfessorPhoto";
import { Typewriter } from "@/components/marketing/Typewriter";

/**
 * A scripted demo of what the product actually does — the lesson player with the
 * LEAP AI tutor answering against that lesson.
 *
 * Deliberately NOT a live chat: a real tutor call on a public landing page would mean
 * a Gemini request per visitor. The exchanges below are fixed copy that cycles.
 */
const SCRIPT = [
  {
    q: "Summarise this lesson in three points",
    a: "1 · Lead from values, not from fear of judgement.  2 · Name the behaviour, never the person.  3 · Close the loop within 48 hours.",
  },
  {
    q: "What actually makes feedback land?",
    a: "Specificity and timing. Feedback tied to an observable behaviour lands; feedback aimed at identity gets defended against.",
  },
  {
    q: "Quiz me on this one",
    a: "First question: what separates a stated value from a mere preference when the two are under pressure?",
  },
];

const ROTATE_MS = 7000;

export function HeroProductMock({
  professorName,
  professorTitle,
}: {
  professorName: string;
  professorTitle: string;
}) {
  const reduce = useReducedMotion();
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setStep((v) => (v + 1) % SCRIPT.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [reduce]);

  const current = SCRIPT[step];

  return (
    <div className="relative">
      {/* Bezel — two stacked planes give the card real thickness rather than a
          flat bordered rectangle. */}
      <div className="relative rounded-[1.75rem] bg-gradient-to-br from-white/[0.14] to-white/[0.03] p-1.5 shadow-lift ring-1 ring-white/10 backdrop-blur-sm">
        <div className="overflow-hidden rounded-[1.375rem] bg-navy-900/95 ring-1 ring-white/10 dark:bg-card">
          {/* App chrome: a real lesson breadcrumb, not a fake browser toolbar. */}
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold-500 text-navy-900">
              <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-[13px] font-semibold text-white">
                Leading Self · Lesson 3
              </p>
              <p className="truncate text-[11px] text-cream-100/50">Values under pressure</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/10 sm:block">
                <div className="h-full w-2/3 rounded-full bg-gold-500" />
              </div>
              <span className="font-heading text-[11px] font-semibold tabular-nums text-cream-100/70">
                67%
              </span>
            </div>
          </div>

          {/* Lesson video */}
          <div className="relative aspect-video bg-gradient-to-br from-navy-700 to-navy-900 dark:from-surface-2 dark:to-card">
            <HeroMedia className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/10 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 p-3.5">
              <ProfessorPhoto className="h-8 w-8 shrink-0 ring-2 ring-white/20" rounded="rounded-full" position="top" sizes="32px" />
              <div className="min-w-0">
                <p className="truncate font-heading text-xs font-bold text-white">{professorName}</p>
                <p className="truncate text-[11px] text-cream-100/60">{professorTitle}</p>
              </div>
            </div>
          </div>

          {/* AI tutor exchange — decorative motion, hidden from assistive tech so the
              retyping text isn't announced on a loop. */}
          <div className="space-y-2.5 px-4 py-4" aria-hidden>
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-white/10 px-3.5 py-2 text-right text-[12.5px] leading-relaxed text-cream-100">
                {reduce ? current.q : <Typewriter key={step} text={current.q} speed={34} startDelay={250} />}
              </p>
            </div>

            <div className="flex gap-2.5">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold-500/15 text-gold-400 ring-1 ring-gold-500/25">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <AnimatePresence mode="wait">
                <motion.p
                  key={step}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.45, delay: reduce ? 0 : 1.5, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-2 text-[12.5px] leading-relaxed text-cream-100/85 ring-1 ring-white/10"
                >
                  {current.a}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Floating checkpoint chip — the one place a little motion is worth it. */}
      <div
        className="absolute -left-3 bottom-16 hidden animate-float items-center gap-2.5 rounded-2xl bg-white p-3 shadow-lift sm:flex lg:-left-8"
        style={{ animationDelay: "1.2s" }}
      >
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-green-100 text-green-700">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
        <div>
          <p className="font-heading text-xs font-bold leading-tight text-navy-900">Checkpoint passed</p>
          <p className="text-[11px] leading-tight text-navy-500">AI-graded · instant feedback</p>
        </div>
      </div>
    </div>
  );
}
