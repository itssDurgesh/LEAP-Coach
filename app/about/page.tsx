import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Target,
  Sparkles,
  GraduationCap,
  Briefcase,
  Rocket,
  Brain,
  BookOpen,
  ScrollText,
  Gamepad2,
  Bot,
  Users,
  Quote,
  Lightbulb,
  HeartHandshake,
} from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/button-variants";

export const metadata = {
  title: { absolute: "About LEAP Coach — Mission, Team & Prof. Vishal Gupta" },
  description:
    "LEAP Coach brings the leadership coaching of Prof. Vishal Gupta (IIM Ahmedabad) to students, professionals, and entrepreneurs. Here's who we are and what we teach.",
  alternates: { canonical: "/about" },
};

const domains = [
  "Personality development",
  "Mindfulness",
  "Inner engineering",
  "Social intelligence",
  "Leadership skills",
  "Career development",
  "Communication",
  "Executive presence",
  "Personal brand",
];

const gaps = [
  {
    icon: GraduationCap,
    title: "Gaps in formal school education",
    body: "Schooling is exam-oriented and academic. Even good schools rarely prioritise behavioural and leadership development, the skills that shape a life.",
  },
  {
    icon: Users,
    title: "Counseling is grossly inadequate",
    body: "The average student-to-counselor ratio is ~500:1, and over 1000:1 in public schools, against an ideal of 250:1. Seeking help is also still treated as taboo.",
  },
  {
    icon: Briefcase,
    title: "Little behavioural training at work",
    body: "Coaching and one-to-one mentoring go to CXOs and hi-potentials. Most professionals fend for themselves.",
  },
  {
    icon: Rocket,
    title: "Gaps in entrepreneurship education",
    body: "Founders learn tactics, not character. People, leadership, and culture-building, the things that make ventures last, are seldom taught at all.",
  },
];

const mission = [
  {
    icon: HeartHandshake,
    title: "Coaching conversations",
    body: "Enable real coaching conversations on behavioural skills, the kind most people never get access to.",
  },
  {
    icon: Gamepad2,
    title: "Engaging content",
    body: "Offer game-based and simulation-based content that makes building leadership skills engaging.",
  },
  {
    icon: Bot,
    title: "An AI coaching platform",
    body: "Create a platform where learners engage in AI-based coaching conversations to keep improving their behavioural skills.",
  },
];

const disciplines = [
  "Business management",
  "Philosophy",
  "Spirituality",
  "History",
  "Literature",
  "Sports",
  "Communications",
  "Psychology",
];

const personas = [
  { icon: GraduationCap, label: "Students" },
  { icon: Briefcase, label: "Professionals" },
  { icon: Rocket, label: "Entrepreneurs" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-surface">
      <SiteNav overlay />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-900 to-navy-950 dark:from-card dark:via-card dark:to-surface">
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-44 h-80 w-80 rounded-full bg-navy-600/40 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 lg:py-28">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.16em] text-gold-400">
            About · L·E·A·P Coach
          </p>
          <h1 className="mt-4 font-heading text-4xl font-extrabold leading-[1.08] text-white sm:text-5xl">
            Creating <span className="text-gradient-gold">High-Performance Stars</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-cream-100/80">
            Leadership Excellence and Authentic Performance: a 24/7 AI-powered friend and life coach
            for students, professionals, and entrepreneurs.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={buttonClasses({ variant: "primary", size: "lg" })}>
              Start Your Journey <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/team"
              className={buttonClasses({
                variant: "outline",
                size: "lg",
                className: "border-white/30 bg-transparent text-white hover:bg-card/10",
              })}
            >
              Meet the team
            </Link>
          </div>
        </div>
      </section>

      {/* ── What is LEAP Coach ── */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div>
            <Badge variant="gold">What is LEAP Coach?</Badge>
            <h2 className="mt-4 font-heading text-3xl font-bold text-heading sm:text-4xl">
              Leadership excellence, available 24/7
            </h2>
            <div className="mt-5 space-y-4 leading-relaxed text-muted">
              <p>
                <span className="font-semibold text-heading">LEAP Coach</span> is envisioned as a{" "}
                <span className="font-semibold text-heading">24/7 AI-powered friend and life coach</span>{" "}
                for students, professionals, and entrepreneurs. It helps build leadership excellence and
                authentic performance through coaching and mentoring across the domains that matter most.
              </p>
              <p>
                Our learners build the ability to influence without authority, develop power, create a
                strong personal brand and executive presence, build high-performance organisations, and
                sustain well-being through positive thinking, emotional resilience, and authentic living.
              </p>
              <p>
                What sets LEAP apart is its integration of{" "}
                <span className="font-semibold text-heading">scientific literature with ancient Indian
                scriptures</span>
                , so learners get timeless wisdom alongside modern life skills.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-hair bg-card p-7 shadow-card">
            <h3 className="font-heading text-lg font-semibold text-heading">Coaching domains</h3>
            <p className="mt-1 text-sm text-muted">What LEAP Coach helps you develop:</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {domains.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-surface px-3 py-1.5 text-sm font-medium text-heading"
                >
                  <Sparkles className="h-3.5 w-3.5 text-gold-600" /> {d}
                </span>
              ))}
            </div>
            <div className="mt-6 border-t border-hair pt-5">
              <p className="text-sm font-medium text-heading">Built for three journeys</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {personas.map((p) => (
                  <div key={p.label} className="rounded-xl bg-surface-2 p-3 text-center">
                    <p.icon className="mx-auto h-5 w-5 text-gold-600" />
                    <p className="mt-1.5 text-xs font-semibold text-heading">{p.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why LEAP Coach ── */}
      <section className="bg-card">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="navy">Why LEAP Coach?</Badge>
            <h2 className="mt-4 font-heading text-3xl font-bold text-heading sm:text-4xl">
              The gap nobody else is filling
            </h2>
            <p className="mt-3 text-muted">
              Behavioural and leadership development is the most under-served need in education and work.
              LEAP Coach exists to close that gap.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {gaps.map((g) => (
              <div key={g.title} className="rounded-2xl border border-hair bg-surface p-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-navy-900 shadow-gold">
                  <g.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-heading text-lg font-semibold text-heading">{g.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vision & Mission ── */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Vision */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 to-navy-950 dark:from-surface-2 dark:to-card p-8 text-white shadow-navy sm:p-10">
            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gold-500/20 blur-2xl" />
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-gold-400">
              <Compass className="h-6 w-6" />
            </span>
            <h2 className="mt-5 font-heading text-2xl font-bold sm:text-3xl">Our Vision</h2>
            <p className="mt-4 text-lg leading-relaxed text-cream-100/85">
              To provide high-quality, evidence-based behavioural education in a practical and engaging
              manner to students, professionals, and entrepreneurs.
            </p>
          </div>

          {/* Mission */}
          <div className="rounded-3xl border border-hair bg-card p-8 shadow-card sm:p-10">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-100 text-gold-700">
              <Target className="h-6 w-6" />
            </span>
            <h2 className="mt-5 font-heading text-2xl font-bold text-heading sm:text-3xl">Our Mission</h2>
            <ul className="mt-5 space-y-4">
              {mission.map((m) => (
                <li key={m.title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-gold-600">
                    <m.icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="font-heading font-semibold text-heading">{m.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">{m.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Disciplines ── */}
      <section className="bg-card">
        <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8">
          <Badge variant="gold">Wisdom from many sources</Badge>
          <h2 className="mt-4 font-heading text-3xl font-bold text-heading sm:text-4xl">
            Lessons drawn from across disciplines
          </h2>
          <p className="mt-3 text-muted">
            LEAP Coach draws on a wide range of fields, then integrates scientific research with ancient
            Indian scriptures to deliver wisdom you can put to use.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            {disciplines.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-surface px-4 py-2 text-sm font-medium text-heading"
              >
                <BookOpen className="h-3.5 w-3.5 text-gold-600" /> {d}
              </span>
            ))}
          </div>
          <div className="mx-auto mt-9 flex max-w-2xl items-start gap-3 rounded-2xl border border-gold-200 bg-gold-50 p-5 text-left dark:bg-gold-500/10">
            <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" />
            <p className="text-sm leading-relaxed text-heading">
              <span className="font-semibold">Indian Wisdom, modernised.</span> Life and leadership
              lessons from the Mahabharata, the Upanishads, and more, paired with modern behavioural
              science.
            </p>
          </div>
        </div>
      </section>

      {/* ── Founder quote ── */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 p-8 shadow-gold sm:p-12">
          <Quote className="absolute right-6 top-6 h-16 w-16 text-white/20" />
          <p className="relative max-w-3xl font-heading text-2xl font-semibold leading-snug text-navy-900 sm:text-3xl">
            &ldquo;The work of a leader is to lead from values — not from fear of judgement.&rdquo;
          </p>
          <p className="relative mt-4 font-heading font-bold text-navy-900">
            — Prof. Vishal Gupta, Founder · IIM Ahmedabad
          </p>
          <Link
            href="/team"
            className="relative mt-6 inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
          >
            <Lightbulb className="h-4 w-4" /> Meet the people behind LEAP
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-navy-900 dark:bg-card px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
          <h2 className="relative font-heading text-3xl font-bold text-white sm:text-4xl">
            Ready to begin your LEAP?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-cream-100/75">
            Join LEAP Coach today and start your first coaching session in minutes.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={buttonClasses({ variant: "primary", size: "lg" })}>
              Start Your Journey <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/courses"
              className={buttonClasses({
                variant: "outline",
                size: "lg",
                className: "border-white/30 bg-transparent text-white hover:bg-card/10",
              })}
            >
              Explore Topics
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
