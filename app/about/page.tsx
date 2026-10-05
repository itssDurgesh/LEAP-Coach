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
  Lightbulb,
  HeartHandshake,
} from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { CARD, SectionHead, Tag } from "@/components/marketing/SectionHead";
import { v2Button } from "@/components/v2/button";

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
  { icon: GraduationCap, label: "Students", look: "bg-lv-self-tint text-lv-self-dark" },
  { icon: Briefcase, label: "Professionals", look: "bg-lv-people-tint text-lv-people-dark" },
  { icon: Rocket, label: "Entrepreneurs", look: "bg-lv-peers-tint text-lv-peers-dark" },
];

// One colour per card in "Why LEAP Coach", in order.
const gapLooks = [
  "bg-lv-self-tint text-lv-self-dark",
  "bg-lv-people-tint text-lv-people-dark",
  "bg-lv-upwards-tint text-lv-upwards-dark",
  "bg-lv-peers-tint text-lv-peers-dark",
];

export default function AboutPage() {
  return (
    <div className="app-v2 min-h-screen overflow-x-clip bg-surface font-sans text-heading">
      <SiteNav />

      {/* ── Hero ── */}
      <section className="relative">
        <span aria-hidden className="absolute -left-16 top-10 h-48 w-48 rounded-full bg-gold-400/20" />
        <span aria-hidden className="absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-lv-self/20" />
        <div className="relative mx-auto max-w-4xl px-5 pb-16 pt-14 text-center sm:px-8 lg:pb-20 lg:pt-20">
          <Tag>About · L·E·A·P Coach</Tag>
          <h1 className="mt-5 text-balance font-heading text-display-lg font-bold text-heading">
            Creating <span className="text-v2-gold-text sm:whitespace-nowrap">High-Performance Stars</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-7 text-v2-body">
            Leadership Excellence and Authentic Performance: a 24/7 AI-powered friend and life coach
            for students, professionals, and entrepreneurs.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={v2Button("primary")}>
              Start Your Journey <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/team" className={v2Button("outline")}>
              Meet the team
            </Link>
          </div>
        </div>
      </section>

      {/* ── What is LEAP Coach ── */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div>
            <SectionHead tag="What is LEAP Coach?" title="Leadership excellence, available 24/7" />
            <div className="mt-5 space-y-4 text-base leading-7 text-v2-body">
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

          <div className={`${CARD} p-7`}>
            <h3 className="font-heading text-xl font-semibold tracking-[-0.01em] text-heading">Coaching domains</h3>
            <p className="mt-1 text-sm text-v2-body">What LEAP Coach helps you develop:</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {domains.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-heading"
                >
                  <Sparkles className="h-3.5 w-3.5 text-v2-gold-text" /> {d}
                </span>
              ))}
            </div>
            <p className="mt-7 text-sm font-semibold text-heading">Built for three journeys</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {personas.map((p) => (
                <div key={p.label} className={`rounded-2xl p-3 text-center ${p.look}`}>
                  <p.icon className="mx-auto h-5 w-5" />
                  <p className="mt-1.5 text-xs font-semibold text-heading">{p.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why LEAP Coach ── */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <SectionHead
          center
          tag="Why LEAP Coach?"
          title="The gap nobody else is filling"
          text="Behavioural and leadership development is the most under-served need in education and work. LEAP Coach exists to close that gap."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {gaps.map((g, i) => (
            <div key={g.title} className={`${CARD} p-7`}>
              <span className={`grid h-12 w-12 place-items-center rounded-full ${gapLooks[i % gapLooks.length]}`}>
                <g.icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
              </span>
              <h3 className="mt-5 font-heading text-xl font-semibold tracking-[-0.01em] text-heading">{g.title}</h3>
              <p className="mt-2 text-[15px] leading-6 text-v2-body">{g.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Vision & Mission ── */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Vision */}
          <div className="relative overflow-hidden rounded-[28px] bg-v2-navy p-8 shadow-v2-card sm:p-10">
            <span aria-hidden className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-gold-400/15" />
            <span className="relative grid h-12 w-12 place-items-center rounded-full bg-white/10 text-gold-400">
              <Compass className="h-6 w-6" />
            </span>
            <h2 className="relative mt-5 font-heading text-2xl font-bold tracking-[-0.015em] text-white sm:text-3xl">Our Vision</h2>
            <p className="relative mt-4 text-lg leading-7 text-v2-on-navy-muted">
              To provide high-quality, evidence-based behavioural education in a practical and engaging
              manner to students, professionals, and entrepreneurs.
            </p>
          </div>

          {/* Mission */}
          <div className={`${CARD} p-8 sm:p-10`}>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-v2-gold-soft text-v2-gold-text">
              <Target className="h-6 w-6" />
            </span>
            <h2 className="mt-5 font-heading text-2xl font-bold tracking-[-0.015em] text-heading sm:text-3xl">Our Mission</h2>
            <ul className="mt-5 space-y-4">
              {mission.map((m) => (
                <li key={m.title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-v2-gold-text">
                    <m.icon className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <p className="font-heading font-semibold text-heading">{m.title}</p>
                    <p className="mt-0.5 text-sm leading-5 text-v2-body">{m.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Disciplines ── */}
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-16">
        <SectionHead
          center
          tag="Wisdom from many sources"
          title="Lessons drawn from across disciplines"
          text="LEAP Coach draws on a wide range of fields, then integrates scientific research with ancient Indian scriptures to deliver wisdom you can put to use."
        />
        <div className="mt-9 flex flex-wrap justify-center gap-2.5">
          {disciplines.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-medium text-heading shadow-v2-soft"
            >
              <BookOpen className="h-3.5 w-3.5 text-v2-gold-text" /> {d}
            </span>
          ))}
        </div>
        <div className="mx-auto mt-9 flex max-w-2xl items-start gap-3 rounded-[20px] bg-v2-gold-soft p-5 text-left">
          <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-v2-gold-text" />
          <p className="text-sm leading-6 text-heading">
            <span className="font-semibold">Indian Wisdom, modernised.</span> Life and leadership
            lessons from the Mahabharata, the Upanishads, and more, paired with modern behavioural
            science.
          </p>
        </div>
      </section>

      {/* ── Founder quote ── */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <figure className="relative overflow-hidden rounded-[28px] bg-v2-gold-soft p-8 sm:p-12">
          <span aria-hidden className="block font-heading text-6xl leading-none text-gold-500">
            &ldquo;
          </span>
          <blockquote className="mt-1 max-w-3xl text-balance font-heading text-2xl font-semibold leading-snug text-heading sm:text-3xl">
            The work of a leader is to lead from values — not from fear of judgement.
          </blockquote>
          <figcaption className="mt-5 text-sm font-semibold text-v2-gold-text">
            Prof. Vishal Gupta, Founder · IIM Ahmedabad
          </figcaption>
          <Link href="/team" className={v2Button("strong", "sm", "mt-6")}>
            <Lightbulb className="h-4 w-4" /> Meet the people behind LEAP
          </Link>
        </figure>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="relative overflow-hidden rounded-[28px] bg-v2-navy px-6 py-14 text-center shadow-v2-card sm:px-12">
          <span aria-hidden className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-gold-400/15" />
          <span aria-hidden className="absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-lv-self/20" />
          <h2 className="relative text-balance font-heading text-display font-bold text-white">
            Ready to begin your LEAP?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-v2-on-navy-muted">
            Join LEAP Coach today and start your first coaching session in minutes.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={v2Button("primary")}>
              Start Your Journey <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/courses" className={v2Button("ghostOnNavy", "md", "border border-white/25")}>
              Explore Topics
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
