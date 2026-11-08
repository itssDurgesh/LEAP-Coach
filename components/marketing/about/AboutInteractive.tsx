"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, BookOpen, Briefcase, Check, GraduationCap, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

// ── L·E·A·P, letter by letter ────────────────────────────────────────────────
const LETTERS = [
  { letter: "L", word: "Leadership", line: "Lead yourself first, then people, peers, cultures and organisations." },
  { letter: "E", word: "Excellence", line: "High standards, practised daily, with honest feedback on how you are doing." },
  { letter: "A", word: "Authentic", line: "Act from your values, not from fear of judgement." },
  { letter: "P", word: "Performance", line: "Results that hold up under pressure, sustained alongside your well-being." },
];

/**
 * The four letters of LEAP. They take turns on their own until someone hovers,
 * focuses or taps one; then the chosen letter stays.
 */
export function LeapLetters() {
  const [active, setActive] = React.useState(0);
  const [touched, setTouched] = React.useState(false);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (touched || reduce) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % LETTERS.length), 2600);
    return () => window.clearInterval(t);
  }, [touched, reduce]);

  const choose = (i: number) => {
    setTouched(true);
    setActive(i);
  };

  return (
    <div className="mx-auto mt-10 max-w-2xl">
      <div role="tablist" aria-label="What LEAP stands for" className="flex justify-center gap-2.5 sm:gap-3.5">
        {LETTERS.map((l, i) => {
          const on = i === active;
          return (
            <button
              key={l.letter}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="leap-letter-panel"
              onMouseEnter={() => choose(i)}
              onFocus={() => choose(i)}
              onClick={() => choose(i)}
              className={cn(
                "group relative grid h-16 w-16 place-items-center rounded-2xl font-heading text-3xl font-bold transition-all duration-300 ease-out-expo sm:h-20 sm:w-20 sm:text-4xl",
                on ? "-translate-y-1 bg-v2-navy text-gold-400 shadow-v2-lift" : "bg-card text-heading shadow-v2-soft hover:-translate-y-0.5",
              )}
            >
              {l.letter}
              <span
                aria-hidden
                className={cn("absolute -bottom-2 h-1 rounded-full bg-[#E9B93E] transition-all duration-300", on ? "w-8" : "w-0")}
              />
            </button>
          );
        })}
      </div>
      <div id="leap-letter-panel" role="tabpanel" aria-live="polite" className="mt-6 min-h-[64px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: reduce ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -6 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <p className="font-heading text-xl font-semibold text-heading">
              <span className="text-v2-gold-text">{LETTERS[active].letter}</span>
              {LETTERS[active].word.slice(1)}
            </p>
            <p className="mt-1 text-[15px] leading-6 text-v2-body">{LETTERS[active].line}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Coaching domains ─────────────────────────────────────────────────────────
const DOMAINS: { name: string; line: string }[] = [
  { name: "Personality development", line: "Understand your strengths, habits and blind spots, and grow on purpose." },
  { name: "Mindfulness", line: "Train attention and calm, so you respond rather than react." },
  { name: "Inner engineering", line: "Build the inner discipline that steadies your mind and your choices." },
  { name: "Social intelligence", line: "Read people and situations well, and build trust across differences." },
  { name: "Leadership skills", line: "Influence without authority, take ownership and bring people with you." },
  { name: "Career development", line: "Make deliberate career choices and grow into bigger roles." },
  { name: "Communication", line: "Say what matters clearly, listen fully and handle hard conversations." },
  { name: "Executive presence", line: "Carry yourself with the composure and credibility people follow." },
  { name: "Personal brand", line: "Be known for what you stand for, online and in the room." },
];

/** The coaching domains as chips; picking one says what working on it means. */
export function DomainExplorer() {
  const [picked, setPicked] = React.useState(4); // Leadership skills
  return (
    <div>
      <div className="mt-5 flex flex-wrap gap-2">
        {DOMAINS.map((d, i) => {
          const on = i === picked;
          return (
            <button
              key={d.name}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked(i)}
              onMouseEnter={() => setPicked(i)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
                on ? "bg-v2-strong text-v2-on-strong shadow-v2-soft" : "bg-surface text-heading hover:bg-surface-2",
              )}
            >
              <Sparkles className={cn("h-3.5 w-3.5", on ? "text-gold-400" : "text-v2-gold-text")} /> {d.name}
            </button>
          );
        })}
      </div>
      <div aria-live="polite" className="mt-4 min-h-[52px] rounded-2xl bg-v2-gold-soft px-4 py-3">
        <AnimatePresence mode="wait">
          <motion.p
            key={picked}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm leading-5 text-heading"
          >
            <span className="font-semibold">{DOMAINS[picked].name}.</span> {DOMAINS[picked].line}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Three journeys ───────────────────────────────────────────────────────────
const JOURNEYS: { id: string; label: string; icon: LucideIcon; look: string; tagline: string; points: string[] }[] = [
  {
    id: "student",
    label: "Students",
    icon: GraduationCap,
    look: "bg-lv-self-tint text-lv-self-dark",
    tagline: "Academic skill-building, exam prep and career readiness.",
    points: ["Confidence for interviews and presentations", "Focus, habits and time management for exams", "Clarity about career paths and personal goals"],
  },
  {
    id: "professional",
    label: "Professionals",
    icon: Briefcase,
    look: "bg-lv-people-tint text-lv-people-dark",
    tagline: "Leadership, negotiation, strategy and executive skills.",
    points: ["Lead a team and influence without authority", "Give feedback, negotiate and handle conflict", "Build executive presence and a personal brand"],
  },
  {
    id: "entrepreneur",
    label: "Entrepreneurs",
    icon: Rocket,
    look: "bg-lv-peers-tint text-lv-peers-dark",
    tagline: "Business strategy, growth, fundraising and scaling.",
    points: ["Build a culture people want to join", "Lead through uncertainty and pressure", "Grow yourself as fast as the venture"],
  },
];

/** "Built for three journeys": pick one to see what LEAP covers on it. */
export function JourneyTabs() {
  const [active, setActive] = React.useState(1);
  const j = JOURNEYS[active];
  return (
    <div>
      <p className="mt-7 text-sm font-semibold text-heading">Built for three journeys</p>
      <div role="tablist" aria-label="Learning paths" className="mt-3 grid grid-cols-3 gap-3">
        {JOURNEYS.map((p, i) => {
          const on = i === active;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(i)}
              className={cn(
                "rounded-2xl p-3 text-center transition-all duration-200 ease-out-expo",
                p.look,
                on ? "-translate-y-0.5 ring-2 ring-heading/80 shadow-v2-soft" : "opacity-80 hover:-translate-y-0.5 hover:opacity-100",
              )}
            >
              <p.icon className="mx-auto h-5 w-5" />
              <span className="mt-1.5 block text-xs font-semibold text-heading">{p.label}</span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="mt-4 rounded-2xl bg-surface p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={j.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <p className="text-sm font-medium text-v2-body">{j.tagline}</p>
            <ul className="mt-2.5 space-y-1.5">
              {j.points.map((pt) => (
                <li key={pt} className="flex items-start gap-2 text-sm text-heading">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-lv-orgs-dark" strokeWidth={2.5} /> {pt}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-v2-gold-text hover:underline">
              Start as {j.id === "entrepreneur" ? "an" : "a"} {j.label.slice(0, -1).toLowerCase()}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Students per counselor ───────────────────────────────────────────────────
const RATIOS = [
  { label: "Recommended", value: 250, look: "bg-lv-orgs" },
  { label: "Average school", value: 500, look: "bg-[#E9B93E]" },
  { label: "Public schools", value: 1000, look: "bg-lv-people" },
];

/** Students per counselor, as bars that grow when they scroll into view. */
export function CounselorRatios() {
  const ref = React.useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const shown = seen || reduce;
  return (
    <div ref={ref} className="mt-5 space-y-2.5" aria-label="Students per school counselor">
      {RATIOS.map((r, i) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-v2-body">{r.label}</span>
            <span className="font-semibold tabular-nums text-heading">
              {r.value.toLocaleString("en-IN")}
              {r.value === 1000 ? "+" : ""} : 1
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn("h-full rounded-full transition-[width] duration-1000 ease-out-expo", r.look)}
              style={{ width: shown ? `${(r.value / 1000) * 100}%` : "0%", transitionDelay: `${i * 150}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Disciplines ──────────────────────────────────────────────────────────────
const DISCIPLINES: { name: string; line: string }[] = [
  { name: "Business management", line: "Frameworks for strategy, teams and decisions." },
  { name: "Philosophy", line: "Clear thinking about values, purpose and judgement." },
  { name: "Spirituality", line: "Inner steadiness and meaning beyond results." },
  { name: "History", line: "How leaders acted under pressure, and what followed." },
  { name: "Literature", line: "Stories that show character, choice and consequence." },
  { name: "Sports", line: "Discipline, teamwork and performing when it counts." },
  { name: "Communications", line: "Persuasion, listening and the craft of being understood." },
  { name: "Psychology", line: "Evidence on motivation, habits, bias and resilience." },
];

/** The disciplines LEAP draws on; hover or tap one to see what it brings. */
export function DisciplineChips() {
  const [picked, setPicked] = React.useState<number | null>(null);
  return (
    <div>
      <div className="mt-9 flex flex-wrap justify-center gap-2.5">
        {DISCIPLINES.map((d, i) => {
          const on = picked === i;
          return (
            <button
              key={d.name}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked(on ? null : i)}
              onMouseEnter={() => setPicked(i)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-v2-soft transition-all duration-200 ease-out-expo",
                on ? "-translate-y-0.5 bg-v2-navy text-white" : "bg-card text-heading hover:-translate-y-0.5",
              )}
            >
              <BookOpen className={cn("h-3.5 w-3.5", on ? "text-gold-400" : "text-v2-gold-text")} /> {d.name}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="mx-auto mt-5 min-h-6 max-w-xl text-center text-[15px] text-v2-body">
        {picked === null ? (
          <span className="text-muted">Hover or tap a discipline to see what it brings to a leader.</span>
        ) : (
          <>
            <span className="font-semibold text-heading">{DISCIPLINES[picked].name}:</span> {DISCIPLINES[picked].line}
          </>
        )}
      </p>
    </div>
  );
}

// ── Mission, one step at a time ──────────────────────────────────────────────
export function MissionSteps({ items }: { items: { title: string; body: string }[] }) {
  const [open, setOpen] = React.useState(0);
  return (
    <ol className="mt-5 space-y-2">
      {items.map((m, i) => {
        const on = open === i;
        return (
          <li key={m.title}>
            <button
              type="button"
              aria-expanded={on}
              onClick={() => setOpen(i)}
              onMouseEnter={() => setOpen(i)}
              className={cn(
                "flex w-full items-start gap-3.5 rounded-2xl p-3 text-left transition-colors duration-200",
                on ? "bg-surface" : "hover:bg-surface/60",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full font-heading text-sm font-bold transition-colors duration-200",
                  on ? "bg-[#E9B93E] text-navy-800" : "bg-surface-2 text-v2-gold-text",
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-heading font-semibold text-heading">{m.title}</span>
                <span
                  className={cn(
                    "grid text-sm leading-5 text-v2-body transition-all duration-300 ease-out-expo",
                    on ? "mt-0.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <span className="overflow-hidden">{m.body}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** A pull quote that writes itself in, word by word, as it scrolls into view. */
export function QuoteReveal({ text }: { text: string }) {
  const ref = React.useRef<HTMLQuoteElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.7 });
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <blockquote ref={ref} className="mt-1 max-w-3xl text-balance font-heading text-2xl font-semibold leading-snug text-heading sm:text-3xl">
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          className="inline-block"
          initial={{ opacity: reduce ? 1 : 0.15 }}
          animate={{ opacity: seen || reduce ? 1 : 0.15 }}
          transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.06 }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </blockquote>
  );
}

/** Small lift-on-hover wrapper used by the About cards. */
export function LiftCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-v2-lift", className)}>{children}</div>;
}

